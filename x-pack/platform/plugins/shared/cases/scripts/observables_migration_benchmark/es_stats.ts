/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import type { ObservablesMigrationState } from '../../server/tasks/observables_migration/types';
import { ALERTING_CASES_INDEX } from '../observables_load_test/probe';

const TASK_MANAGER_INDEX = '.kibana_task_manager';
const MIGRATION_TASK_DOC_ID = 'task:cases:cases_observables_migration';

export const HAS_FIELD_OBSERVABLES: estypes.QueryDslQueryContainer = {
  nested: {
    path: 'cases.observables',
    query: { exists: { field: 'cases.observables.typeKey' } },
  },
};

export interface IndexStats {
  /** Lucene documents, nested documents included. */
  luceneDocs: number;
  deletedDocs: number;
  storeBytes: number;
  segments: number;
}

export interface ObjectCounts {
  byType: Record<string, number>;
  observableAttachments: number;
  withLegacyId: number;
  casesWithFieldObservables: number;
  fieldObservables: number;
}

export interface MigrationTask {
  status: string;
  runAt: string;
  state: ObservablesMigrationState;
}

export const getIndexStats = async (es: Client): Promise<IndexStats> => {
  const stats = await es.indices.stats({
    index: ALERTING_CASES_INDEX,
    metric: ['docs', 'store', 'segments'],
  });
  const primaries = stats._all.primaries;
  return {
    luceneDocs: primaries?.docs?.count ?? 0,
    deletedDocs: primaries?.docs?.deleted ?? 0,
    storeBytes: primaries?.store?.size_in_bytes ?? 0,
    segments: primaries?.segments?.count ?? 0,
  };
};

export const countObservableAttachments = async (es: Client): Promise<number> => {
  const { count } = await es.count({
    index: ALERTING_CASES_INDEX,
    query: { term: { 'cases-attachments.type': 'observable' } },
  });
  return count;
};

export const getObjectCounts = async (es: Client): Promise<ObjectCounts> => {
  const [types, observableAttachments, withLegacyId, field] = await Promise.all([
    es.search<unknown, { types: { buckets: Array<{ key: string; doc_count: number }> } }>({
      index: ALERTING_CASES_INDEX,
      size: 0,
      aggs: { types: { terms: { field: 'type', size: 100 } } },
    }),
    countObservableAttachments(es),
    es.count({
      index: ALERTING_CASES_INDEX,
      query: { exists: { field: 'cases-attachments.data.legacyId' } },
    }),
    es.search<unknown, { observables: { doc_count: number } }>({
      index: ALERTING_CASES_INDEX,
      size: 0,
      track_total_hits: true,
      query: HAS_FIELD_OBSERVABLES,
      aggs: { observables: { nested: { path: 'cases.observables' } } },
    }),
  ]);

  const { total } = field.hits;
  return {
    byType: Object.fromEntries(
      (types.aggregations?.types.buckets ?? []).map(({ key, doc_count: count }) => [key, count])
    ),
    observableAttachments,
    withLegacyId: withLegacyId.count,
    casesWithFieldObservables: typeof total === 'number' ? total : total?.value ?? 0,
    fieldObservables: field.aggregations?.observables.doc_count ?? 0,
  };
};

/** The migration task as Task Manager stores it, or nothing before it is scheduled. */
export const getMigrationTask = async (es: Client): Promise<MigrationTask | undefined> => {
  const response = await es.get<{ task: { status: string; runAt: string; state: string } }>(
    { index: TASK_MANAGER_INDEX, id: MIGRATION_TASK_DOC_ID },
    { ignore: [404] }
  );
  const task = response._source?.task;
  if (!response.found || task == null) {
    return undefined;
  }
  return { status: task.status, runAt: task.runAt, state: JSON.parse(task.state) };
};

export const ATTACHMENT_SO_TYPE = 'cases-attachments';

/** Documents of a saved-object type by `typeMigrationVersion`; `none` counts docs without one. */
export const getTypeVersionCounts = async (
  es: Client,
  type: string = ATTACHMENT_SO_TYPE
): Promise<Record<string, number>> => {
  const response = await es.search<
    unknown,
    { versions: { buckets: Array<{ key: string; doc_count: number }> } }
  >({
    index: ALERTING_CASES_INDEX,
    size: 0,
    query: { term: { type } },
    aggs: { versions: { terms: { field: 'typeMigrationVersion', size: 50, missing: 'none' } } },
  });
  return Object.fromEntries(
    (response.aggregations?.versions.buckets ?? []).map(({ key, doc_count: count }) => [key, count])
  );
};

/** Documents of the type below `version`, compared the way the `version` field type orders them. */
export const countBelowVersion = (counts: Record<string, number>, version: string): number =>
  Object.entries(counts)
    .filter(([key]) => key === 'none' || compareVersions(key, version) < 0)
    .reduce((sum, [, count]) => sum + count, 0);

const compareVersions = (a: string, b: string): number => {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
};

export interface ByQueryTask {
  id: string;
  action: string;
  description?: string;
  runningSeconds: number;
  total: number;
  updated: number;
  deleted: number;
  versionConflicts: number;
}

/** Running `update_by_query` and `delete_by_query` tasks, such as the migration's mappings pickup. */
export const getByQueryTasks = async (es: Client): Promise<ByQueryTask[]> => {
  const response = await es.tasks.list({ actions: '*byquery', detailed: true });
  return Object.values(response.nodes ?? {}).flatMap(({ tasks }) =>
    Object.entries(tasks).map(([id, task]) => {
      const status = (task.status ?? {}) as {
        total?: number;
        updated?: number;
        deleted?: number;
        version_conflicts?: number;
      };
      return {
        id,
        action: task.action,
        description: task.description,
        runningSeconds: Math.round(Number(task.running_time_in_nanos) / 1e9),
        total: status.total ?? 0,
        updated: status.updated ?? 0,
        deleted: status.deleted ?? 0,
        versionConflicts: status.version_conflicts ?? 0,
      };
    })
  );
};

export interface NodeStats {
  cpuPercent: number;
  heapPercent: number;
  currentMerges: number;
}

/** CPU, heap and merges of the (single) Elasticsearch node. */
export const getNodeStats = async (es: Client): Promise<NodeStats | undefined> => {
  const response = await es.nodes.stats({ metric: ['process', 'jvm', 'indices'] });
  const [node] = Object.values(response.nodes ?? {});
  if (node == null) {
    return undefined;
  }
  return {
    cpuPercent: node.process?.cpu?.percent ?? 0,
    heapPercent: node.jvm?.mem?.heap_used_percent ?? 0,
    currentMerges: node.indices?.merges?.current ?? 0,
  };
};

/** Id of the disabled probe rule `--mode prepare` created, found by its tag. */
export const findProbeRuleId = async (es: Client, tag: string): Promise<string | undefined> => {
  const response = await es.search({
    index: ALERTING_CASES_INDEX,
    size: 1,
    _source: false,
    query: { bool: { filter: [{ term: { type: 'alert' } }, { term: { 'alert.tags': tag } }] } },
  });
  return response.hits.hits[0]?._id?.replace(/^alert:/, '');
};
