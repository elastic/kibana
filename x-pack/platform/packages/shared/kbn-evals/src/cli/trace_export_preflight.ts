/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';
import { Metadata } from '@grpc/grpc-js';
import { core, resources, tracing } from '@elastic/opentelemetry-node/sdk';
import { OTLPTraceExporter as OTLPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPTraceExporter as OTLPTraceExporterHTTP } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPTraceExporterPROTO } from '@opentelemetry/exporter-trace-otlp-proto';
import { createFailError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';

const OTLP_PROTOCOLS = ['http', 'grpc', 'proto'] as const;
type OtlpProtocol = (typeof OTLP_PROTOCOLS)[number];

export interface OtlpExporterTarget {
  readonly protocol: OtlpProtocol;
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface CanaryExportFailure {
  readonly target: OtlpExporterTarget;
  readonly error: string;
}

export interface CanaryResult {
  readonly traceId: string;
  readonly failures: readonly CanaryExportFailure[];
}

export interface TraceReadTarget {
  readonly url: string;
  readonly apiKey?: string;
}

export interface TraceExportPreflightDeps {
  sendCanarySpan: (targets: readonly OtlpExporterTarget[]) => Promise<CanaryResult>;
  countTraceDocs: (target: TraceReadTarget, traceId: string) => Promise<number>;
  sleep: (ms: number) => Promise<unknown>;
  now: () => number;
}

export interface RunTraceExportPreflightOptions {
  /** The environment the eval run will see (process env merged with CLI overrides). */
  env: Readonly<Record<string, string | undefined>>;
  /** Fail the run on a problem; otherwise only warn. */
  enforce: boolean;
  log: ToolingLog;
  timeoutMs?: number;
  pollIntervalMs?: number;
  deps?: Partial<TraceExportPreflightDeps>;
}

const CANARY_SCOPE = '@kbn/evals-preflight';
const CANARY_SPAN_NAME = 'kbn-evals trace export preflight';
const EXPORT_TIMEOUT_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const OPT_OUT_HINT =
  'Pass --allow-missing-traces to run anyway (traces from this run may be incomplete).';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');

/** Strips credentials from a URL so it can be logged. */
export const redactUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return url;
  }
};

/** Returns the OTLP exporters in a `TRACING_EXPORTERS` value; Phoenix and Langfuse are not checked. */
export const parseOtlpExporters = (tracingExporters: string): OtlpExporterTarget[] => {
  const parsed: unknown = JSON.parse(tracingExporters);
  const entries: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

  return entries.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    return OTLP_PROTOCOLS.flatMap((protocol) => {
      const config = entry[protocol];
      if (!isRecord(config) || typeof config.url !== 'string') return [];
      const { url, headers } = config;
      return [{ protocol, url, ...(isStringRecord(headers) ? { headers } : {}) }];
    });
  });
};

const createExporter = ({ protocol, url, headers }: OtlpExporterTarget) => {
  switch (protocol) {
    case 'grpc': {
      const metadata = new Metadata();
      Object.entries(headers ?? {}).forEach(([key, value]) => metadata.add(key, value));
      return new OTLPTraceExporterGRPC({ url, metadata, timeoutMillis: EXPORT_TIMEOUT_MS });
    }
    case 'proto':
      return new OTLPTraceExporterPROTO({ url, headers, timeoutMillis: EXPORT_TIMEOUT_MS });
    case 'http':
      return new OTLPTraceExporterHTTP({ url, headers, timeoutMillis: EXPORT_TIMEOUT_MS });
  }
};

// Connection failures surface as an AggregateError with an empty message but a `code`.
const describeExportError = (error: (Error & { code?: unknown }) | undefined): string =>
  error?.message || (typeof error?.code === 'string' ? error.code : undefined) || 'export failed';

/** Exports one span to every target and reports which targets rejected it. */
const sendCanarySpan = async (targets: readonly OtlpExporterTarget[]): Promise<CanaryResult> => {
  const memory = new tracing.InMemorySpanExporter();
  const provider = new tracing.BasicTracerProvider({
    resource: resources.resourceFromAttributes({ 'service.name': 'kbn-evals-preflight' }),
    spanProcessors: [new tracing.SimpleSpanProcessor(memory)],
  });
  const span = provider.getTracer(CANARY_SCOPE).startSpan(CANARY_SPAN_NAME);
  const { traceId } = span.spanContext();
  span.end();
  const spans = memory.getFinishedSpans();
  await provider.shutdown();

  const failures = await Promise.all(
    targets.map(async (target): Promise<CanaryExportFailure | undefined> => {
      const exporter = createExporter(target);
      try {
        const result = await new Promise<core.ExportResult>((resolve) =>
          exporter.export(spans, resolve)
        );
        if (result.code === core.ExportResultCode.SUCCESS) return undefined;
        return { target, error: describeExportError(result.error) };
      } finally {
        await exporter.shutdown().catch(() => undefined);
      }
    })
  );

  return { traceId, failures: failures.filter((failure) => failure !== undefined) };
};

/** Counts documents for a trace in `traces-*`, matching both OTel and ECS trace id fields. */
const countTraceDocs = async ({ url, apiKey }: TraceReadTarget, traceId: string) => {
  const parsed = new URL(url);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (apiKey) {
    headers.authorization = `ApiKey ${apiKey}`;
  } else if (parsed.username) {
    const credentials = `${decodeURIComponent(parsed.username)}:${decodeURIComponent(
      parsed.password
    )}`;
    headers.authorization = `Basic ${Buffer.from(credentials).toString('base64')}`;
  }
  parsed.username = '';
  parsed.password = '';
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/traces-*/_count`;

  const response = await fetch(parsed, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: {
        bool: {
          should: [{ term: { trace_id: traceId } }, { term: { 'trace.id': traceId } }],
          minimum_should_match: 1,
        },
      },
    }),
    signal: AbortSignal.timeout(EXPORT_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
  }
  const { count } = (await response.json()) as { count?: number };
  return count ?? 0;
};

interface FindTraceExportProblemOptions {
  timeoutMs: number;
  pollIntervalMs: number;
  deps: TraceExportPreflightDeps;
  log: ToolingLog;
}

const describeTargets = (targets: readonly OtlpExporterTarget[]): string =>
  targets.map(({ protocol, url }) => `${protocol} ${redactUrl(url)}`).join(', ');

/** Returns a description of the first problem found, or undefined when traces arrive. */
const findTraceExportProblem = async (
  targets: readonly OtlpExporterTarget[],
  readTarget: TraceReadTarget | undefined,
  { timeoutMs, pollIntervalMs, deps, log }: FindTraceExportProblemOptions
): Promise<string | undefined> => {
  const { traceId, failures } = await deps.sendCanarySpan(targets);
  if (failures.length > 0) {
    const details = failures
      .map(({ target, error }) => `${describeTargets([target])}: ${error}`)
      .join('; ');
    return `Trace exporter rejected a test span (${details}).`;
  }

  if (!readTarget) {
    log.warning(
      '[traces] Exporters accepted a test span, but TRACING_ES_URL is not set, so delivery to ' +
        'traces-* cannot be verified.'
    );
    return undefined;
  }

  const deadline = deps.now() + timeoutMs;
  let lastError: string | undefined;
  do {
    try {
      if ((await deps.countTraceDocs(readTarget, traceId)) > 0) return undefined;
      lastError = undefined;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await deps.sleep(pollIntervalMs);
  } while (deps.now() < deadline);

  const readUrl = redactUrl(readTarget.url);
  if (lastError) {
    return `Could not query traces-* at ${readUrl} to verify trace delivery: ${lastError}`;
  }
  return (
    `A test span (trace ${traceId}) was accepted by ${describeTargets(targets)} but did not ` +
    `appear in traces-* at ${readUrl} within ${Math.round(timeoutMs / 1000)}s. The exporter may ` +
    'be dropping data (e.g. bad credentials), or it writes to a different cluster than ' +
    'TRACING_ES_URL. For the local EDOT collector, check: node scripts/evals logs --service edot'
  );
};

/**
 * Sends a test span through the configured OTLP trace exporters and confirms it reaches
 * `traces-*`, so a broken tracing pipeline fails the run instead of silently dropping traces.
 */
export const runTraceExportPreflight = async ({
  env,
  enforce,
  log,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  deps,
}: RunTraceExportPreflightOptions): Promise<void> => {
  const { TRACING_EXPORTERS: tracingExporters, TRACING_ES_URL: esUrl } = env;
  if (!tracingExporters) {
    log.info('[traces] TRACING_EXPORTERS is not set; skipping the trace export check.');
    return;
  }

  const targets = parseOtlpExporters(tracingExporters);
  if (targets.length === 0) {
    log.info('[traces] No OTLP trace exporters configured; skipping the trace export check.');
    return;
  }

  log.info(`[traces] Checking trace export via ${describeTargets(targets)}...`);
  const problem = await findTraceExportProblem(
    targets,
    esUrl ? { url: esUrl, apiKey: env.TRACING_ES_API_KEY || undefined } : undefined,
    {
      timeoutMs,
      pollIntervalMs,
      log,
      deps: { sendCanarySpan, countTraceDocs, sleep, now: Date.now, ...deps },
    }
  );

  if (!problem) {
    log.success('[traces] Trace export verified.');
    return;
  }
  if (enforce) {
    throw createFailError(`${problem}\n${OPT_OUT_HINT}`);
  }
  log.warning(`[traces] ${problem} Continuing; traces from this run may be incomplete.`);
};
