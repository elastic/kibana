/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import { destOf, runDirOf } from '../config';
import type { StageContext } from '../context';
import { writeJson } from '../download';
import type { DumpedKi, KiDump, WorkflowRunSummary } from '../types';
import { runUntilDone } from '../workflow_runner';
import { getAiIndex } from './configure';
import { readImportManifest } from './import';

/** The KIs dreaming writes: facts, entities and the relationships between them. */
export const DREAMED_KIS_QUERY: estypes.QueryDslQueryContainer = {
  bool: {
    should: [
      { prefix: { type: 'fact.' } },
      { prefix: { type: 'entity.' } },
      { term: { type: 'memory.relationship' } },
    ],
    minimum_should_match: 1,
  },
};

const DUMP_PAGE = 1000;

const DREAMING_WORKFLOW = /^system-context-engine-(?:trace-|transcript-)?dreaming-/;

export const kiDumpFileOf = (dir: string): string => path.join(dir, 'kis.json');

export const cleanDreamedKis = async (esClient: Client, dest: string): Promise<number> => {
  const response = await esClient.deleteByQuery(
    {
      index: dest,
      query: DREAMED_KIS_QUERY,
      conflicts: 'proceed',
      refresh: true,
      ignore_unavailable: true,
      allow_no_indices: true,
    },
    { ignore: [404] }
  );
  return response.deleted ?? 0;
};

/** Every dreamed KI that is not deleted, without its embeddings. */
export const dumpDreamedKis = async (esClient: Client, dest: string): Promise<DumpedKi[]> => {
  const kis: DumpedKi[] = [];
  let searchAfter: estypes.SortResults | undefined;
  for (;;) {
    const response = await esClient.search<DumpedKi>(
      {
        index: dest,
        size: DUMP_PAGE,
        sort: [{ id: 'asc' }],
        ...(searchAfter && { search_after: searchAfter }),
        query: {
          bool: {
            filter: [DREAMED_KIS_QUERY],
            must_not: [{ term: { 'governance.lifecycle.status': 'deleted' } }],
          },
        },
        _source: [
          'id',
          'type',
          'title',
          'description',
          'content',
          'attributes',
          'references',
          'updated_at',
        ],
        ignore_unavailable: true,
      },
      { ignore: [404] }
    );
    const hits = response.hits?.hits ?? [];
    kis.push(...hits.flatMap(({ _source: source }) => (source ? [source] : [])));
    if (hits.length < DUMP_PAGE) {
      return kis;
    }
    searchAfter = hits[hits.length - 1].sort;
  }
};

const countByType = (kis: DumpedKi[]): Record<string, number> =>
  kis.reduce<Record<string, number>>((counts, { type }) => {
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});

const describeRun = ({ status, output, error, durationMs }: WorkflowRunSummary): string => {
  const counts = ['rounds', 'memories', 'created', 'updated', 'deleted', 'rejected']
    .concat(['relationships_created', 'relationships_rejected'])
    .filter((key) => output?.[key] !== undefined)
    .map((key) => `${key} ${output?.[key]}`)
    .join(', ');
  const reason = error ?? (typeof output?.reason === 'string' ? output.reason : undefined);
  return `${status} in ${Math.round(durationMs / 1000)}s${counts ? `: ${counts}` : ''}${
    reason ? ` (${reason})` : ''
  }`;
};

export const runRun = async (context: StageContext): Promise<void> => {
  const { config, esClient, kibana, log, runId } = context;
  const timeoutMs = config.run.execution_timeout_minutes * 60_000;
  for (const aiIndex of config.ai_indices.filter(({ id }) => context.aiIndexIds.includes(id))) {
    const stored = await getAiIndex(context, aiIndex.id);
    if (!stored) {
      throw new Error(`AI index '${aiIndex.id}' does not exist: run the configure stage first`);
    }
    const dest = destOf(aiIndex.id);
    const deleted = await cleanDreamedKis(esClient, dest);
    log.info(`${aiIndex.id}: deleted ${deleted} dreamed KIs from ${dest}`);

    const manifests = aiIndex.datasets.map((dataset) => readImportManifest(context, dataset));
    if (manifests.some((manifest) => !manifest)) {
      throw new Error(`${aiIndex.id}: a dataset is not imported yet: run the import stage first`);
    }
    const earliest = manifests
      .map((manifest) => manifest?.earliest ?? '')
      .sort()
      .find(Boolean);
    const since = earliest && new Date(Date.parse(earliest) - 60_000).toISOString();

    const workflowRuns: WorkflowRunSummary[] = [];
    for (const { value: workflowId } of stored.automations.filter(
      ({ type }) => type === 'workflow'
    )) {
      const isDreaming = DREAMING_WORKFLOW.test(workflowId);
      log.info(
        `${aiIndex.id}: running ${workflowId}${isDreaming && since ? ` since ${since}` : ''}`
      );
      const runs = await runUntilDone({
        kibana,
        workflowId,
        since: isDreaming ? since : undefined,
        maxRuns: isDreaming ? config.run.max_runs_per_workflow : 1,
        timeoutMs,
        onRun: (summary, run) => log.info(`  run ${run}: ${describeRun(summary)}`),
      });
      workflowRuns.push(...runs);
    }

    const kis = await dumpDreamedKis(esClient, dest);
    const dump: KiDump = {
      runId,
      aiIndexId: aiIndex.id,
      dest,
      dumpedAt: new Date().toISOString(),
      workflowRuns,
      counts: countByType(kis),
      kis,
    };
    const file = kiDumpFileOf(runDirOf(config, runId, aiIndex.id));
    writeJson(file, dump);
    log.success(
      `${aiIndex.id}: ${kis.length} KIs (${Object.entries(dump.counts)
        .map(([type, count]) => `${type} ${count}`)
        .join(', ')}) → ${path.relative(process.cwd(), file)}`
    );
  }
};
