/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates N alerting v2 rules whose every execution pulls the full wide index
 * through the ES|QL executor (see seed_wide_index.ts), so each run is a
 * memory-heavy `alerting_v2:rule_executor` task.
 *
 * Rules are created in parallel on purpose: creation sets `runAt = now`, so the
 * first executions form a herd of N concurrent runs (enable/disable does not).
 *
 * Usage:
 *   node --import tsx x-pack/platform/plugins/shared/task_manager/scripts/benchmark/create_v2_rules.ts \
 *     [--count 20] [--index tm-bench-wide-source] [--columns 2] [--every 1m] [--kind signal] [--limit 0] [--prefix tm-bench-rule]
 *   node --import tsx .../create_v2_rules.ts --cleanup      # deletes every rule tagged tm-bench
 *
 * `--kind alert` groups by host.name and produces episodes (the 46 MB response stays
 * in Kibana heap but only ~100 episode docs are written); `--kind signal` (default)
 * persists every returned row to .rule-events, a 46 MB bulk write per run that a
 * small Elasticsearch node rejects under indexing pressure.
 * `--limit N` appends `| LIMIT N` so you can build lighter mixes from the same index.
 */

import {
  BENCH_TAG,
  DEFAULT_INDEX,
  chunk,
  intArg,
  kbn,
  log,
  mapConcurrent,
  parseArgs,
  strArg,
  wideQuery,
} from './lib';

const RULES_PATH = '/api/alerting/v2/rules';
const MAX_BULK_ITEMS = 100;

interface RuleListResponse {
  items: Array<{ id: string }>;
  total: number;
}

const listBenchRuleIds = async (): Promise<string[]> => {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const filter = encodeURIComponent(`metadata.tags:"${BENCH_TAG}"`);
    const result = await kbn<RuleListResponse>(
      `${RULES_PATH}?filter=${filter}&per_page=${MAX_BULK_ITEMS}&page=${page}`
    );
    ids.push(...result.items.map(({ id }) => id));
    if (result.items.length < MAX_BULK_ITEMS) break;
  }
  return ids;
};

const cleanup = async (): Promise<void> => {
  const ids = await listBenchRuleIds();
  log(`Deleting ${ids.length} rules tagged "${BENCH_TAG}"`);
  for (const batch of chunk(ids, MAX_BULK_ITEMS)) {
    await kbn(`${RULES_PATH}/_bulk_delete`, { method: 'POST', body: { ids: batch } });
  }
  log('Done');
};

const create = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const count = intArg(args, 'count', 20);
  const index = strArg(args, 'index', DEFAULT_INDEX);
  const columns = intArg(args, 'columns', 2);
  const every = strArg(args, 'every', '1m');
  const kind = strArg(args, 'kind', 'signal');
  const limit = intArg(args, 'limit', 0);
  const concurrency = intArg(args, 'concurrency', 20);
  const prefix = strArg(args, 'prefix', `${BENCH_TAG}-rule`);

  const base =
    limit > 0 ? `${wideQuery(index, columns)} | LIMIT ${limit}` : wideQuery(index, columns);
  log(`Creating ${count} "${kind}" rules every ${every}: ${base}`);

  const bodies = Array.from({ length: count }, (_, i) => ({
    kind,
    metadata: { name: `${prefix}-${String(i + 1).padStart(4, '0')}`, tags: [BENCH_TAG] },
    time_field: '@timestamp',
    // Long lookback so the seeded rows always fall inside the time filter.
    schedule: { every, lookback: '365d' },
    query: { base },
    ...(kind === 'alert'
      ? {
          grouping: { fields: ['host.name'] },
          recovery: { strategy: 'no_breach' },
          no_data: { strategy: 'ignore' },
        }
      : {}),
  }));

  const created = await mapConcurrent(bodies, concurrency, async (body) => {
    const rule = await kbn<{ id: string }>(RULES_PATH, { method: 'POST', body, expect: [201] });
    return rule.id;
  });
  log(`Done: ${created.length} rules created`);
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.has('cleanup')) return cleanup();
  return create();
};

main().catch((error) => {
  log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
