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
