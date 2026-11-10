/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared helpers for the Task Manager benchmark scripts. Dependency-light on purpose:
 * only `fetch` and Node built-ins, so the scripts run with `node --import tsx`.
 *
 * Env overrides (defaults match `pnpm es snapshot` + `pnpm start --no-base-path`):
 *   KIBANA_URL=http://localhost:5601
 *   ES_URL=http://localhost:9200
 *   KIBANA_USERNAME=elastic  KIBANA_PASSWORD=changeme
 *   ES_USERNAME=elastic      ES_PASSWORD=changeme
 */

export interface BenchConfig {
  readonly kibanaUrl: string;
  readonly esUrl: string;
  readonly kibanaAuth: string;
  readonly esAuth: string;
}

const basicAuth = (user: string, pass: string): string =>
  `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

export const CONFIG: BenchConfig = {
  kibanaUrl: (process.env.KIBANA_URL ?? 'http://localhost:5601').replace(/\/$/, ''),
  esUrl: (process.env.ES_URL ?? 'http://localhost:9200').replace(/\/$/, ''),
  kibanaAuth: basicAuth(
    process.env.KIBANA_USERNAME ?? 'elastic',
    process.env.KIBANA_PASSWORD ?? 'changeme'
  ),
  esAuth: basicAuth(process.env.ES_USERNAME ?? 'elastic', process.env.ES_PASSWORD ?? 'changeme'),
};

/** Tag / name prefix shared by every object the benchmark creates, so cleanup is exact. */
export const BENCH_TAG = 'tm-bench';

export const DEFAULT_INDEX = 'tm-bench-wide-source';

export interface Args {
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
}

/** Parses `--flag` and `--key=value` / `--key value` arguments. */
export const parseArgs = (argv: readonly string[]): Args => {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 0) {
      values.set(arg.slice(2, eq), arg.slice(eq + 1));
      continue;
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      values.set(arg.slice(2), next);
      i++;
    } else {
      flags.add(arg.slice(2));
    }
  }
  return { flags, values };
};

export const intArg = (args: Args, name: string, fallback: number): number => {
  const raw = args.values.get(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) throw new Error(`--${name} must be an integer, got "${raw}"`);
  return parsed;
};

export const strArg = (args: Args, name: string, fallback: string): string =>
  args.values.get(name) ?? fallback;

export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

interface RequestOptions {
  readonly method?: string;
  readonly body?: unknown;
  readonly rawBody?: string;
  readonly contentType?: string;
  readonly expect?: readonly number[];
}

const request = async <T>(
  url: string,
  auth: string,
  extraHeaders: Record<string, string>,
  { method = 'GET', body, rawBody, contentType, expect = [200, 201] }: RequestOptions
): Promise<T> => {
  const response = await fetch(url, {
    method,
    headers: {
      authorization: auth,
      'content-type': contentType ?? 'application/json',
      ...extraHeaders,
    },
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await response.text();
  if (!expect.includes(response.status)) {
    throw new Error(`${method} ${url} -> HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  return (text.length > 0 ? JSON.parse(text) : undefined) as T;
};

export const kbn = <T = unknown>(path: string, options: RequestOptions = {}): Promise<T> =>
  request<T>(
    `${CONFIG.kibanaUrl}${path}`,
    CONFIG.kibanaAuth,
    { 'kbn-xsrf': 'tm-bench', 'x-elastic-internal-origin': 'kibana' },
    options
  );

export const es = <T = unknown>(path: string, options: RequestOptions = {}): Promise<T> =>
  request<T>(`${CONFIG.esUrl}${path}`, CONFIG.esAuth, {}, options);

/** Runs `fn` over `items` with at most `concurrency` in flight. */
export const mapConcurrent = async <T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
};

export const log = (message: string): void => {
  process.stdout.write(`[${new Date().toISOString()}] ${message}\n`);
};

export const payloadColumn = (index: number): string => `payload_${index}`;

export const payloadColumns = (columns: number): string[] =>
  Array.from({ length: columns }, (_, i) => payloadColumn(i));

/** ES|QL query that returns every wide row, i.e. roughly rows × columns × columnBytes bytes. */
export const wideQuery = (index: string, columns: number): string =>
  `FROM ${index} | KEEP @timestamp, host.name, ${payloadColumns(columns).join(', ')}`;
