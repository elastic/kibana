/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates N scheduled workflows that each run an ES|QL step over the wide index
 * (see seed_wide_index.ts), so every `workflow:scheduled` task run holds a large
 * ES|QL response in the execution engine.
 *
 * Usage:
 *   node --import tsx x-pack/platform/plugins/shared/task_manager/scripts/benchmark/create_workflows.ts \
 *     [--count 20] [--index tm-bench-wide-source] [--columns 2] [--every 1m] [--limit 0] [--max-step-size 100mb]
 *   node --import tsx .../create_workflows.ts --cleanup   # deletes every workflow named tm-bench-wf-*
 *
 * The scheduled trigger's minimum interval is 1m.
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

const NAME_PREFIX = `${BENCH_TAG}-wf`;

const workflowYaml = (name: string, every: string, query: string, maxStepSize: string): string =>
  [
    `name: ${name}`,
    'enabled: true',
    'description: Task Manager adaptive-capacity benchmark workload',
    'triggers:',
    '  - type: scheduled',
    '    with:',
    `      every: ${every}`,
    'steps:',
    '  - name: fetch_wide_rows',
    '    type: elasticsearch.esql.query',
    // The engine rejects step outputs above 10 MB by default; the wide query is ~46 MB.
    `    max-step-size: ${maxStepSize}`,
    '    with:',
    '      format: json',
    `      query: "${query.replace(/"/g, '\\"')}"`,
    '  - name: report',
    '    type: console',
    '    with:',
    '      message: "fetched {{ steps.fetch_wide_rows.output.values | size }} rows"',
    '',
  ].join('\n');

interface WorkflowListResponse {
  results: Array<{ id: string; name: string }>;
}

const listBenchWorkflowIds = async (): Promise<string[]> => {
  const result = await kbn<WorkflowListResponse>(
    `/api/workflows?query=${encodeURIComponent(NAME_PREFIX)}&size=1000`
  );
  return result.results.filter(({ name }) => name.startsWith(NAME_PREFIX)).map(({ id }) => id);
};

const cleanup = async (): Promise<void> => {
  const ids = await listBenchWorkflowIds();
  log(`Deleting ${ids.length} workflows named ${NAME_PREFIX}-*`);
  for (const batch of chunk(ids, 100)) {
    await kbn('/api/workflows', { method: 'DELETE', body: { ids: batch } });
  }
  log('Done');
};

const create = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const count = intArg(args, 'count', 20);
  const index = strArg(args, 'index', DEFAULT_INDEX);
  const columns = intArg(args, 'columns', 2);
  const every = strArg(args, 'every', '1m');
  const limit = intArg(args, 'limit', 0);
  const concurrency = intArg(args, 'concurrency', 10);
  const maxStepSize = strArg(args, 'max-step-size', '100mb');

  const query =
    limit > 0 ? `${wideQuery(index, columns)} | LIMIT ${limit}` : wideQuery(index, columns);
  log(`Creating ${count} scheduled workflows every ${every}: ${query}`);

  const names = Array.from(
    { length: count },
    (_, i) => `${NAME_PREFIX}-${String(i + 1).padStart(4, '0')}`
  );
  const created = await mapConcurrent(names, concurrency, async (name) => {
    const workflow = await kbn<{ id: string }>('/api/workflows/workflow', {
      method: 'POST',
      body: { yaml: workflowYaml(name, every, query, maxStepSize) },
    });
    return workflow.id;
  });
  log(`Done: ${created.length} workflows created`);
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
