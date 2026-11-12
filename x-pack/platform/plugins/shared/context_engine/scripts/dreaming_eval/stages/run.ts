/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import type { AiIndexEvalConfig, DatasetName } from '../config';
import { destOf, runDirOf } from '../config';
import type { StageContext } from '../context';
import { writeJson } from '../download';
import type { DumpedKi, ImportManifest, KiDump, WorkflowRunSummary } from '../types';
import { runUntilDone } from '../workflow_runner';
import { getAiIndex } from './configure';
import { isPerSample, readExtracted, readImportManifest, writeDatasetSpans } from './import';

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
const RESTORE_BATCH = 200;

const DREAMING_WORKFLOW = /^system-context-engine-(?:trace-|transcript-)?dreaming-/;

export const kiDumpFileOf = (dir: string): string => path.join(dir, 'kis.json');

/** Where the KIs of one sample of a run go, when samples run one at a time. */
export const sampleDirOf = (runDir: string, sample: string): string =>
  path.join(runDir, 'samples', sample);

/** The samples of a run that have a KI dump, in order. */
export const dumpedSamplesOf = (runDir: string): string[] => {
  const dir = path.join(runDir, 'samples');
  return fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((sample) => fs.existsSync(kiDumpFileOf(sampleDirOf(runDir, sample))))
        .sort()
    : [];
};

/** Whether a run dumped KIs for an AI index, as a whole or per sample. */
export const hasKiDump = (runDir: string): boolean =>
  fs.existsSync(kiDumpFileOf(runDir)) || dumpedSamplesOf(runDir).length > 0;

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

/** Every dreamed KI that is not deleted, its whole document, so it can be restored. */
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

/** Replaces the dreamed KIs of an AI index with dumped ones, as dreaming left them. */
export const restoreDreamedKis = async (
  esClient: Client,
  dest: string,
  kis: DumpedKi[]
): Promise<void> => {
  await cleanDreamedKis(esClient, dest);
  for (let start = 0; start < kis.length; start += RESTORE_BATCH) {
    const batch = kis.slice(start, start + RESTORE_BATCH);
    const response = await esClient.bulk({
      refresh: start + RESTORE_BATCH >= kis.length ? 'wait_for' : false,
      operations: batch.flatMap((ki) => [{ index: { _index: dest, _id: ki.id } }, ki]),
    });
    if (response.errors) {
      const failed = response.items.find((item) => item.index?.error)?.index?.error;
      throw new Error(`Restoring KIs to ${dest} failed: ${JSON.stringify(failed)}`);
    }
  }
};

const countByType = (kis: DumpedKi[]): Record<string, number> =>
  kis.reduce<Record<string, number>>((counts, { type }) => {
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});

const describeCounts = (counts: Record<string, number>): string =>
  Object.entries(counts)
    .map(([type, count]) => `${type} ${count}`)
    .join(', ');

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

/** A minute before the earliest imported round: where the first dreaming run reads from. */
const sinceOf = (manifests: ImportManifest[]): string | undefined => {
  const earliest = manifests
    .map(({ earliest: at }) => at)
    .filter(Boolean)
    .sort()[0];
  return earliest && new Date(Date.parse(earliest) - 60_000).toISOString();
};

/** Dreams from a clean AI index: deletes what dreaming wrote, then runs each of its workflows. */
const dream = async (
  context: StageContext,
  aiIndex: AiIndexEvalConfig,
  stored: AiIndexHttpItem,
  since: string | undefined,
  label: string
): Promise<{ workflowRuns: WorkflowRunSummary[]; kis: DumpedKi[] }> => {
  const { config, esClient, kibana, log } = context;
  const dest = destOf(aiIndex.id);
  const deleted = await cleanDreamedKis(esClient, dest);
  log.info(`${label}: deleted ${deleted} dreamed KIs from ${dest}`);

  const workflowRuns: WorkflowRunSummary[] = [];
  for (const { value: workflowId } of stored.automations.filter(
    ({ type }) => type === 'workflow'
  )) {
    const isDreaming = DREAMING_WORKFLOW.test(workflowId);
    log.info(`${label}: running ${workflowId}${isDreaming && since ? ` since ${since}` : ''}`);
    const runs = await runUntilDone({
      kibana,
      workflowId,
      since: isDreaming ? since : undefined,
      maxRuns: isDreaming ? config.run.max_runs_per_workflow : 1,
      retries: isDreaming ? config.run.retries : 0,
      timeoutMs: config.run.execution_timeout_minutes * 60_000,
      onRun: (summary, run) => log.info(`  run ${run}: ${describeRun(summary)}`),
    });
    workflowRuns.push(...runs);
  }
  return { workflowRuns, kis: await dumpDreamedKis(esClient, dest) };
};

const writeDump = (
  context: StageContext,
  aiIndex: AiIndexEvalConfig,
  dir: string,
  { workflowRuns, kis }: { workflowRuns: WorkflowRunSummary[]; kis: DumpedKi[] },
  sample?: string
): KiDump => {
  const dump: KiDump = {
    runId: context.runId,
    aiIndexId: aiIndex.id,
    ...(sample && { sample }),
    dest: destOf(aiIndex.id),
    dumpedAt: new Date().toISOString(),
    workflowRuns,
    counts: countByType(kis),
    kis,
  };
  const file = kiDumpFileOf(dir);
  writeJson(file, dump);
  context.log.success(
    `${aiIndex.id}${sample ? ` sample ${sample}` : ''}: ${kis.length} KIs (${describeCounts(
      dump.counts
    )}) → ${path.relative(process.cwd(), file)}`
  );
  return dump;
};

/**
 * Runs the samples of a dataset one at a time: imports a sample's conversations, dreams on them
 * from a clean AI index, and dumps its KIs. A sample this run already dumped is skipped, so an
 * interrupted run picks up where it stopped when started again with the same run id.
 */
const runPerSample = async (
  context: StageContext,
  aiIndex: AiIndexEvalConfig,
  stored: AiIndexHttpItem,
  dataset: DatasetName
): Promise<void> => {
  const runDir = runDirOf(context.config, context.runId, aiIndex.id);
  const extracted = readExtracted(context, dataset);
  for (const [position, sample] of extracted.samples.entries()) {
    const dir = sampleDirOf(runDir, sample);
    const label = `${aiIndex.id} sample ${sample} (${position + 1}/${extracted.samples.length})`;
    if (fs.existsSync(kiDumpFileOf(dir))) {
      context.log.info(`${label}: already dumped in this run; skipping`);
      continue;
    }
    const manifest = await writeDatasetSpans(
      context,
      extracted,
      extracted.sampleConversations[sample] ?? []
    );
    context.log.info(`${label}: imported ${manifest.rounds} rounds`);
    writeDump(
      context,
      aiIndex,
      dir,
      await dream(context, aiIndex, stored, sinceOf([manifest]), label),
      sample
    );
  }
};

export const runRun = async (context: StageContext): Promise<void> => {
  const { config, runId } = context;
  for (const aiIndex of config.ai_indices.filter(({ id }) => context.aiIndexIds.includes(id))) {
    const stored = await getAiIndex(context, aiIndex.id);
    if (!stored) {
      throw new Error(`AI index '${aiIndex.id}' does not exist: run the configure stage first`);
    }
    const perSample = aiIndex.datasets.filter((dataset) => isPerSample(context, dataset));
    if (perSample.length > 0) {
      if (aiIndex.datasets.length > 1) {
        throw new Error(
          `${aiIndex.id}: ${perSample.join(
            ', '
          )} runs samples one at a time (per_sample), which needs an AI index that dreams on that dataset alone`
        );
      }
      await runPerSample(context, aiIndex, stored, perSample[0]);
      continue;
    }

    const manifests = aiIndex.datasets.map((dataset) => readImportManifest(context, dataset));
    if (manifests.some((manifest) => !manifest)) {
      throw new Error(`${aiIndex.id}: a dataset is not imported yet: run the import stage first`);
    }
    const dreamed = await dream(
      context,
      aiIndex,
      stored,
      sinceOf(manifests.flatMap((manifest) => (manifest ? [manifest] : []))),
      aiIndex.id
    );
    writeDump(context, aiIndex, runDirOf(config, runId, aiIndex.id), dreamed);
  }
};
