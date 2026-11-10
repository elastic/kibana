/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Seeds a "wide" source index whose every document carries N keyword columns of
 * M bytes each. An ES|QL query that KEEPs those columns returns about
 * rows × columns × columnBytes bytes, which is what makes a rule or workflow
 * execution memory-heavy inside Kibana.
 *
 * Defaults reproduce the alerting v2 perf profile used on the QA projects:
 * 1,000 rows × 2 columns × 23 KB = ~46 MB per execution, just under the 50 MB
 * `xpack.alerting_v2.rules.run.query.maxResponseSize` guard.
 *
 * Usage:
 *   node --import tsx x-pack/platform/plugins/shared/task_manager/scripts/benchmark/seed_wide_index.ts \
 *     [--index tm-bench-wide-source] [--rows 1000] [--columns 2] [--column-bytes 23000] [--hosts 100] [--serverless]
 *
 * `--serverless` omits the shard and replica settings, which serverless Elasticsearch rejects.
 */

import { DEFAULT_INDEX, chunk, es, intArg, log, parseArgs, payloadColumn, strArg } from './lib';

// Lucene rejects keyword terms above 32,766 bytes.
const MAX_COLUMN_BYTES = 32_000;
const BULK_DOCS = 100;

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const index = strArg(args, 'index', DEFAULT_INDEX);
  const rows = intArg(args, 'rows', 1000);
  const columns = intArg(args, 'columns', 2);
  const columnBytes = intArg(args, 'column-bytes', 23_000);
  const hosts = intArg(args, 'hosts', 100);
  const serverless = args.flags.has('serverless');

  if (columnBytes > MAX_COLUMN_BYTES) {
    throw new Error(`--column-bytes must be <= ${MAX_COLUMN_BYTES}`);
  }

  const bytesPerRow = columns * columnBytes;
  log(
    `Seeding ${rows} rows × ${columns} cols × ${columnBytes} B into "${index}" ` +
      `(~${((rows * bytesPerRow) / 2 ** 20).toFixed(0)} MB per full query)`
  );

  await es(`/${index}`, { method: 'DELETE', expect: [200, 404] });

  const properties: Record<string, unknown> = {
    '@timestamp': { type: 'date' },
    'host.name': { type: 'keyword' },
  };
  for (let i = 0; i < columns; i++) {
    properties[payloadColumn(i)] = { type: 'keyword', ignore_above: MAX_COLUMN_BYTES };
  }
  await es(`/${index}`, {
    method: 'PUT',
    body: {
      settings: serverless
        ? { refresh_interval: '5s' }
        : { number_of_shards: 1, number_of_replicas: 0, refresh_interval: '5s' },
      mappings: { properties },
    },
  });

  const payload: Record<string, string> = {};
  for (let i = 0; i < columns; i++) {
    payload[payloadColumn(i)] = String.fromCharCode(97 + (i % 26)).repeat(columnBytes);
  }
  const now = new Date().toISOString();

  const rowIds = Array.from({ length: rows }, (_, i) => i);
  for (const batch of chunk(rowIds, BULK_DOCS)) {
    const lines: string[] = [];
    for (const row of batch) {
      lines.push(JSON.stringify({ index: { _index: index, _id: String(row) } }));
      lines.push(
        JSON.stringify({ '@timestamp': now, 'host.name': `host-${row % hosts}`, ...payload })
      );
    }
    const result = await es<{ errors: boolean }>('/_bulk', {
      method: 'POST',
      rawBody: `${lines.join('\n')}\n`,
      contentType: 'application/x-ndjson',
    });
    if (result.errors) throw new Error(`bulk indexing reported errors at row ${batch[0]}`);
  }

  await es(`/${index}/_refresh`, { method: 'POST' });
  const count = await es<{ count: number }>(`/${index}/_count`);
  log(`Done: ${count.count} docs in "${index}"`);
};

main().catch((error) => {
  log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
