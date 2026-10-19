/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import readline from 'readline';

/** Research data store (dedicated local ES, default http://localhost:9250). */
export const researchEs = (): Client =>
  new Client({
    node: process.env.WIR_RESEARCH_ES_URL ?? 'http://localhost:9250',
    requestTimeout: 120000,
  });

export const STREAMS = {
  runs: 'research-runs',
  samples: 'research-samples',
  edges: 'research-edges',
  scorecards: 'research-scorecards',
} as const;

const common = {
  run_id: { type: 'keyword' },
  lane: { type: 'keyword' },
  variant: { type: 'keyword' },
  '@timestamp': { type: 'date', format: 'strict_date_optional_time||epoch_millis' },
} as const;

/** Creates index templates for the research data streams (idempotent). */
export const setupStore = async (es: Client): Promise<void> => {
  await es.indices.putIndexTemplate({
    name: STREAMS.samples,
    index_patterns: [`${STREAMS.samples}*`],
    data_stream: {},
    priority: 500,
    template: {
      settings: { number_of_replicas: 0 },
      mappings: {
        dynamic: true,
        // All dynamic numbers as double: epoch-ms fields mapped as float (24-bit mantissa) made
        // range drills silently wrong (Track 0 fix pass).
        dynamic_templates: [
          { numbers_as_double: { match_mapping_type: 'double', mapping: { type: 'double' } } },
          { longs_as_double: { match_mapping_type: 'long', mapping: { type: 'double' } } },
          {
            strings_as_keyword: {
              match_mapping_type: 'string',
              mapping: { type: 'keyword', ignore_above: 1024 },
            },
          },
        ],
        properties: {
          ...common,
          intended: { type: 'double' },
          sent: { type: 'double' },
          start: { type: 'double' },
          timing_start: { type: 'double' },
          timing_stop: { type: 'double' },
          window_start: { type: 'double' },
          status: { type: 'keyword' },
          pod: { type: 'keyword' },
          boot_id: { type: 'keyword' },
          thread: { type: 'keyword' },
          seq: { type: 'long' },
          source: { type: 'keyword' },
          ts: { type: 'double' },
          end: { type: 'double' },
          kind: { type: 'keyword' },
          mode: { type: 'keyword' },
          tm_event: { type: 'keyword' },
          task_type: { type: 'keyword' },
          task_id: { type: 'keyword' },
          error: { type: 'keyword' },
          detail: { type: 'flattened' },
          stats: { type: 'flattened' },
        },
      },
    },
  });
  await es.indices.putIndexTemplate({
    name: STREAMS.runs,
    index_patterns: [`${STREAMS.runs}*`],
    data_stream: {},
    priority: 500,
    template: {
      settings: { number_of_replicas: 0 },
      mappings: {
        dynamic: true,
        properties: {
          ...common,
          status: { type: 'keyword' },
          hypothesis: { type: 'text' },
          source_commit: { type: 'keyword' },
          baseline_commit: { type: 'keyword' },
          image_digest: { type: 'keyword' },
          qaf_project_id: { type: 'keyword' },
          workload_params: { type: 'flattened' },
          expected: { type: 'flattened' },
          pods: { type: 'flattened' },
          host: { type: 'flattened' },
          phases: { type: 'flattened' },
          config_overrides: { type: 'flattened' },
        },
      },
    },
  });
  await es.indices.putIndexTemplate({
    name: STREAMS.edges,
    index_patterns: [`${STREAMS.edges}*`],
    data_stream: {},
    priority: 500,
    template: {
      settings: { number_of_replicas: 0 },
      mappings: {
        dynamic: true,
        properties: {
          ...common,
          caller: { type: 'keyword' },
          callee: { type: 'keyword' },
          path: { type: 'keyword' },
          direction: { type: 'keyword' },
          return_kind: { type: 'flattened' },
          arg_kinds: { type: 'flattened' },
          result_kinds: { type: 'flattened' },
          serialize_failures_in: { type: 'flattened' },
          serialize_failures_out: { type: 'flattened' },
          calls: { type: 'long' },
          bytes_in: { type: 'long' },
          bytes_out: { type: 'long' },
        },
      },
    },
  });
  await es.indices.putIndexTemplate({
    name: STREAMS.scorecards,
    index_patterns: [`${STREAMS.scorecards}*`],
    data_stream: {},
    priority: 500,
    template: {
      settings: { number_of_replicas: 0 },
      mappings: {
        dynamic: true,
        properties: {
          ...common,
          phase: { type: 'keyword' },
          pod: { type: 'keyword' },
          row: { type: 'keyword' },
        },
      },
    },
  });
};

const bulkCreate = async (es: Client, index: string, docs: Array<Record<string, unknown>>) => {
  for (let i = 0; i < docs.length; i += 5000) {
    const chunk = docs.slice(i, i + 5000);
    const operations = chunk.flatMap((doc) => [{ create: { _index: index } }, doc]);
    const res = await es.bulk({ operations, refresh: false });
    if (res.errors) {
      const first = res.items.find((it) => it.create?.error)?.create?.error;
      throw new Error(`bulk errors into ${index}: ${JSON.stringify(first)}`);
    }
  }
};

export const readNdjson = async (file: string): Promise<Array<Record<string, unknown>>> => {
  const out: Array<Record<string, unknown>> = [];
  if (!fs.existsSync(file)) return out;
  const rl = readline.createInterface({ input: fs.createReadStream(file) });
  for await (const line of rl) if (line.trim()) out.push(JSON.parse(line));
  return out;
};

/** Ingests one run directory (manifest.json + *.ndjson) into the research store. */
export const ingestRunDir = async (es: Client, dir: string): Promise<Record<string, number>> => {
  const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));
  const { run_id: runId, lane, variant } = manifest;
  await es.deleteByQuery({
    index: `${STREAMS.samples},${STREAMS.edges},${STREAMS.runs}`,
    query: { term: { run_id: runId } },
    ignore_unavailable: true,
    refresh: true,
    conflicts: 'proceed',
  });
  const counts: Record<string, number> = {};
  const samples = await readNdjson(`${dir}/samples.ndjson`);
  await bulkCreate(
    es,
    STREAMS.samples,
    samples.map((s) => ({
      ...s,
      '@timestamp': Math.round(s.ts as number),
      run_id: runId,
      lane,
      variant,
    }))
  );
  counts.samples = samples.length;
  const edges = await readNdjson(`${dir}/edges.ndjson`);
  if (edges.length) {
    await bulkCreate(
      es,
      STREAMS.edges,
      edges.map((e) => ({ ...e, '@timestamp': manifest.utc_start, run_id: runId, lane, variant }))
    );
  }
  counts.edges = edges.length;
  await bulkCreate(es, STREAMS.runs, [{ ...manifest, '@timestamp': manifest.utc_start }]);
  counts.runs = 1;
  await es.indices.refresh({
    index: `${STREAMS.samples},${STREAMS.runs},${STREAMS.edges}`,
    ignore_unavailable: true,
    allow_no_indices: true,
  });
  return counts;
};

/** Reads every sample of a run back from the store (raw data for derived results). */
export const fetchRunSamples = async (
  es: Client,
  runId: string
): Promise<Array<Record<string, unknown>>> => {
  const out: Array<Record<string, unknown>> = [];
  const pit = await es.openPointInTime({ index: STREAMS.samples, keep_alive: '2m' });
  let searchAfter: Array<string | number> | undefined;
  try {
    for (;;) {
      const res = await es.search<Record<string, unknown>>({
        pit: { id: pit.id, keep_alive: '2m' },
        size: 10000,
        query: { term: { run_id: runId } },
        sort: [{ ts: 'asc' }, { _shard_doc: 'asc' }],
        search_after: searchAfter,
      });
      const hits = res.hits.hits;
      if (!hits.length) break;
      for (const h of hits) out.push(h._source as Record<string, unknown>);
      searchAfter = hits[hits.length - 1].sort as Array<string | number>;
    }
  } finally {
    await es.closePointInTime({ id: pit.id });
  }
  return out;
};

export const fetchManifest = async (
  es: Client,
  runId: string
): Promise<Record<string, unknown>> => {
  const res = await es.search<Record<string, unknown>>({
    index: STREAMS.runs,
    size: 1,
    query: { term: { run_id: runId } },
  });
  const hit = res.hits.hits[0];
  if (!hit) throw new Error(`run ${runId} not found in ${STREAMS.runs}`);
  return hit._source as Record<string, unknown>;
};
