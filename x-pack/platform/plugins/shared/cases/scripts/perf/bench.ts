/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { Client } from '@elastic/elasticsearch';
import yargs from 'yargs';
import { promises as fs } from 'fs';
import path from 'path';
import { ALL_QUERIES, buildQuery, type QueryName, type Variant } from './queries';
import { formatSummary, summarize } from './stats';

const DEFAULT_INDEX = '.kibana_alerting_cases*';

interface BenchArgs {
  esUrl: string;
  esUser: string;
  esPass: string;
  index: string;
  query: QueryName | 'all';
  variant: Variant | 'both';
  iterations: number;
  warmup: number;
  caseIdsPerQuery: number;
  cold: boolean;
  outDir: string;
  caseIdsFile?: string;
  maxCaseIds: number;
}

const parseArgs = (): BenchArgs => {
  const argv = yargs
    .help()
    .option('esUrl', { type: 'string', default: 'http://localhost:9200' })
    .option('esUser', { type: 'string', default: 'elastic' })
    .option('esPass', { type: 'string', default: 'changeme' })
    .option('index', { type: 'string', default: DEFAULT_INDEX })
    .option('query', {
      type: 'string',
      choices: [...ALL_QUERIES, 'all'] as const,
      default: 'all',
    })
    .option('variant', {
      type: 'string',
      choices: ['a', 'b', 'both'] as const,
      default: 'both',
    })
    .option('iterations', { type: 'number', default: 200 })
    .option('warmup', { type: 'number', default: 50 })
    .option('caseIdsPerQuery', {
      type: 'number',
      default: 10,
      describe: 'How many case ids to pass per query (mimics multi-case stats calls).',
    })
    .option('cold', {
      type: 'boolean',
      default: false,
      describe: 'Clear ES caches before every iteration (slow; for cold-cache numbers).',
    })
    .option('outDir', {
      type: 'string',
      default: path.resolve(__dirname, '../../../../../../../../perf-results'),
    })
    .option('caseIdsFile', {
      type: 'string',
      describe: 'Optional JSON file containing the array of case ids to sample from.',
    })
    .option('maxCaseIds', {
      type: 'number',
      default: 5000,
      describe: 'Cap how many case ids we keep in the in-memory pool.',
    }).argv;
  return argv as unknown as BenchArgs;
};

const loadCaseIds = async (
  client: Client,
  index: string,
  cap: number,
  fromFile?: string
): Promise<string[]> => {
  if (fromFile) {
    const raw = await fs.readFile(fromFile, 'utf8');
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids) || ids.some((v) => typeof v !== 'string')) {
      throw new Error(`${fromFile} must contain a JSON array of strings`);
    }
    return (ids as string[]).slice(0, cap);
  }

  // Fetch up to `cap` case SO ids from ES. Cases SO docs use the `cases` SO type.
  // SO _id format: `<type>:<uuid>`. We just want the uuid part for use in queries.
  const res = await client.search({
    index,
    size: cap,
    _source: false,
    fields: ['cases.id'],
    query: { term: { type: 'cases' } },
  });

  const ids: string[] = [];
  for (const hit of res.hits.hits) {
    const id = hit._id;
    if (typeof id === 'string' && id.startsWith('cases:')) {
      ids.push(id.slice('cases:'.length));
    }
  }

  if (ids.length === 0) {
    throw new Error(
      `Found 0 \`cases\` documents in index ${index}. ` +
        `Did you run \`yarn generate:cases\` against this cluster?`
    );
  }

  return ids;
};

const sample = (pool: string[], k: number): string[] => {
  if (pool.length <= k) return [...pool];
  // Simple reservoir-style sampling without replacement.
  const out: string[] = [];
  const used = new Set<number>();
  while (out.length < k) {
    const idx = Math.floor(Math.random() * pool.length);
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(pool[idx]);
  }
  return out;
};

const clearCaches = async (client: Client, index: string): Promise<void> => {
  await client.indices.clearCache({
    index,
    request: true,
    query: true,
    fielddata: true,
  });
};

interface IterationRow {
  iteration: number;
  variant: Variant;
  query: QueryName;
  tookMs: number;
  wallMs: number;
  hitsTotal: number | undefined;
  caseIdsCount: number;
  caseIdsHash: string;
}

const runOne = async (
  client: Client,
  args: BenchArgs,
  query: QueryName,
  variant: Variant,
  pool: string[]
): Promise<IterationRow[]> => {
  console.log(
    `\n[${query}/${variant}] warmup=${args.warmup} iterations=${args.iterations} ` +
      `cold=${args.cold} caseIdsPerQuery=${args.caseIdsPerQuery}`
  );

  // Warmup — drive the JIT and OS cache toward steady state. Discarded.
  for (let i = 0; i < args.warmup; i++) {
    const ids = sample(pool, args.caseIdsPerQuery);
    await client.search({
      index: args.index,
      ...(buildQuery(query, variant, ids) as object),
    });
  }

  const rows: IterationRow[] = [];
  for (let i = 0; i < args.iterations; i++) {
    if (args.cold) {
      await clearCaches(client, args.index);
    }
    const ids = sample(pool, args.caseIdsPerQuery);
    const body = buildQuery(query, variant, ids) as object;
    const t0 = process.hrtime.bigint();
    const res = await client.search({ index: args.index, ...body });
    const wallMs = Number(process.hrtime.bigint() - t0) / 1e6;
    rows.push({
      iteration: i,
      variant,
      query,
      tookMs: typeof res.took === 'number' ? res.took : NaN,
      wallMs,
      hitsTotal:
        typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value,
      caseIdsCount: ids.length,
      caseIdsHash: ids.slice().sort().join(',').slice(0, 32),
    });
    if ((i + 1) % 50 === 0) {
      console.log(`  ${i + 1}/${args.iterations} done`);
    }
  }

  const took = rows.map((r) => r.tookMs).filter((v) => Number.isFinite(v));
  const wall = rows.map((r) => r.wallMs);
  console.log('\n' + formatSummary(`[${query}/${variant}] ES took`, summarize(took)));
  console.log(formatSummary(`[${query}/${variant}] client wall`, summarize(wall)));

  return rows;
};

const writeCsv = async (outDir: string, query: QueryName, rows: IterationRow[]): Promise<void> => {
  await fs.mkdir(outDir, { recursive: true });
  const file = path.join(
    outDir,
    `${query}-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
  );
  const header = 'iteration,variant,query,took_ms,wall_ms,hits_total,case_ids_count,case_ids_hash';
  const body = rows
    .map(
      (r) =>
        `${r.iteration},${r.variant},${r.query},${r.tookMs},${r.wallMs.toFixed(3)},${
          r.hitsTotal ?? ''
        },${r.caseIdsCount},${r.caseIdsHash}`
    )
    .join('\n');
  await fs.writeFile(file, `${header}\n${body}\n`, 'utf8');
  console.log(`Wrote ${rows.length} rows to ${file}`);
};

(async () => {
  const args = parseArgs();
  const client = new Client({
    node: args.esUrl,
    auth: { username: args.esUser, password: args.esPass },
  });

  const pool = await loadCaseIds(client, args.index, args.maxCaseIds, args.caseIdsFile);
  console.log(`Sampling case ids from a pool of ${pool.length}`);

  const queries: QueryName[] = args.query === 'all' ? ALL_QUERIES : [args.query];
  const variants: Variant[] = args.variant === 'both' ? ['a', 'b'] : [args.variant];

  for (const query of queries) {
    const rows: IterationRow[] = [];
    for (const variant of variants) {
      rows.push(...(await runOne(client, args, query, variant, pool)));
    }
    await writeCsv(args.outDir, query, rows);
  }

  await client.close();
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
