/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import fetch from 'node-fetch';
import { OBSERVABILITY_STREAMS_SIG_EVENTS_LINKED_CODE_INDICES } from '@kbn/management-settings-ids';
import type { GeneratedSignificantEventQuery } from '@kbn/streams-schema';
import { getConnectionConfig, type ConnectionConfig } from '../lib/get_connection_config';
import { generateAuthHeader } from '../lib/kibana';

const LINKED_CODE_INDICES_SETTING = OBSERVABILITY_STREAMS_SIG_EVENTS_LINKED_CODE_INDICES;

interface GenerateResponse {
  queries: GeneratedSignificantEventQuery[];
  tokensUsed: { prompt: number; completion: number; total: number };
  connectorId: string;
}

interface PreviewResponse {
  occurrences: Array<{ date: string; count: number }>;
}

interface QueryReport {
  title: string;
  type: string;
  severity: number;
  esql: string;
  hits: number | null;
  hasCodeEvidence: boolean;
}

interface VariantReport {
  label: string;
  queries: QueryReport[];
  tokens: { prompt: number; completion: number; total: number };
  connectorId: string;
}

async function http(
  config: ConnectionConfig,
  method: string,
  path: string,
  { body, publicApiVersion }: { body?: unknown; publicApiVersion?: string } = {}
): Promise<{ status: number; data: unknown }> {
  const response = await fetch(`${config.kibanaUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: generateAuthHeader(config),
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'sigevents-code-grounding-ab',
      ...(publicApiVersion ? { 'elastic-api-version': publicApiVersion } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

const readLinkedIndices = async (config: ConnectionConfig): Promise<Record<string, string>> => {
  const { status, data } = await http(config, 'GET', '/internal/kibana/global_settings');
  if (status !== 200) {
    throw new Error(`Failed to read global settings (HTTP ${status}): ${JSON.stringify(data)}`);
  }
  const settings = (data as { settings?: Record<string, { userValue?: unknown }> }).settings ?? {};
  const raw = settings[LINKED_CODE_INDICES_SETTING]?.userValue;
  if (typeof raw !== 'string') {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
};

const writeLinkedIndices = async (
  config: ConnectionConfig,
  value: Record<string, string>
): Promise<void> => {
  const { status, data } = await http(config, 'POST', '/internal/kibana/global_settings', {
    body: { changes: { [LINKED_CODE_INDICES_SETTING]: JSON.stringify(value) } },
  });
  if (status !== 200) {
    throw new Error(`Failed to write global settings (HTTP ${status}): ${JSON.stringify(data)}`);
  }
};

const generate = async (
  config: ConnectionConfig,
  streamName: string,
  connectorId?: string
): Promise<GenerateResponse> => {
  const { status, data } = await http(
    config,
    'POST',
    `/internal/streams/${encodeURIComponent(streamName)}/queries/_generate`,
    { body: connectorId ? { connectorId } : {} }
  );
  if (status !== 200) {
    throw new Error(`Query generation failed (HTTP ${status}): ${JSON.stringify(data)}`);
  }
  return data as GenerateResponse;
};

const countHits = async (
  config: ConnectionConfig,
  streamName: string,
  esql: string,
  range: { from: string; to: string; bucketSize: string },
  log: ToolingLog
): Promise<number | null> => {
  const params = new URLSearchParams({
    from: range.from,
    to: range.to,
    bucketSize: range.bucketSize,
  });
  const { status, data } = await http(
    config,
    'POST',
    `/api/streams/${encodeURIComponent(streamName)}/significant_events/_preview?${params}`,
    { body: { query: { esql: { query: esql } } }, publicApiVersion: '2023-10-31' }
  );
  if (status !== 200) {
    log.warning(`Preview failed (HTTP ${status}) for query: ${esql.slice(0, 120)}…`);
    return null;
  }
  const occurrences = (data as PreviewResponse).occurrences ?? [];
  return occurrences.reduce((sum, occ) => sum + (occ.count ?? 0), 0);
};

const toReports = async (
  config: ConnectionConfig,
  streamName: string,
  result: GenerateResponse,
  label: string,
  range: { from: string; to: string; bucketSize: string },
  log: ToolingLog
): Promise<VariantReport> => {
  const queries: QueryReport[] = [];
  for (const query of result.queries) {
    const hits = await countHits(config, streamName, query.esql.query, range, log);
    queries.push({
      title: query.title,
      type: query.type,
      severity: query.severity_score,
      esql: query.esql.query,
      hits,
      hasCodeEvidence: (query.evidence ?? []).some((e) =>
        e.trim().toLowerCase().startsWith('code:')
      ),
    });
  }
  return { label, queries, tokens: result.tokensUsed, connectorId: result.connectorId };
};

const printVariant = (log: ToolingLog, report: VariantReport) => {
  const total = report.queries.length;
  const totalHits = report.queries.reduce((s, q) => s + (q.hits ?? 0), 0);
  const zeroHit = report.queries.filter((q) => q.hits === 0).length;
  const withCode = report.queries.filter((q) => q.hasCodeEvidence).length;
  const avgSeverity = total
    ? Math.round(report.queries.reduce((s, q) => s + q.severity, 0) / total)
    : 0;

  log.info('='.repeat(72));
  log.info(`VARIANT: ${report.label}  (connector: ${report.connectorId})`);
  log.info('='.repeat(72));
  log.info(
    `queries=${total}  total_hits=${totalHits}  zero_hit_queries=${zeroHit}  ` +
      `code_evidence_queries=${withCode}  avg_severity=${avgSeverity}  ` +
      `tokens(in/out)=${report.tokens.prompt}/${report.tokens.completion}`
  );
  for (const q of report.queries) {
    log.info(
      `  • [${q.type}] sev=${q.severity} hits=${q.hits ?? 'n/a'}${
        q.hasCodeEvidence ? ' [code]' : ''
      } — ${q.title}`
    );
    log.info(`      ${q.esql}`);
  }
};

run(
  async ({ log, flags }) => {
    const streamName = String(flags['stream-name'] || '');
    const codeIndex = String(flags['code-index'] || '');
    if (!streamName || !codeIndex) {
      throw new Error('Required: --stream-name <name> --code-index <code-* index>');
    }

    const connectorId = flags['connector-id'] ? String(flags['connector-id']) : undefined;
    const to = String(flags.to || new Date().toISOString());
    const from = String(flags.from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    const bucketSize = String(flags['bucket-size'] || '1h');
    const range = { from, to, bucketSize };

    const config = await getConnectionConfig(flags, log);
    log.info(`Kibana: ${config.kibanaUrl}`);
    log.info(`Stream: ${streamName}  |  Code index: ${codeIndex}`);
    log.info(`Time range: ${from} → ${to} (bucket ${bucketSize})`);
    log.info('');
    log.warning(
      'Prerequisite: the server flag "streams.significantEventsSemanticCodeSearchGroundingEnabled" ' +
        'must be enabled and the SCS workflow tools installed, otherwise the grounded run is identical to baseline.'
    );
    log.info('');

    const originalLinks = await readLinkedIndices(config);

    let baseline: VariantReport | undefined;
    let grounded: VariantReport | undefined;

    try {
      // Baseline: ensure this stream is NOT linked.
      const baselineLinks = { ...originalLinks };
      delete baselineLinks[streamName];
      await writeLinkedIndices(config, baselineLinks);
      log.info('Running BASELINE (stream unlinked)…');
      const baselineResult = await generate(config, streamName, connectorId);
      baseline = await toReports(
        config,
        streamName,
        baselineResult,
        'baseline (no grounding)',
        range,
        log
      );

      // Grounded: link this stream to the code index.
      await writeLinkedIndices(config, { ...originalLinks, [streamName]: codeIndex });
      log.info('Running GROUNDED (stream linked to code index)…');
      const groundedResult = await generate(config, streamName, connectorId);
      grounded = await toReports(config, streamName, groundedResult, 'grounded (SCS)', range, log);
    } finally {
      await writeLinkedIndices(config, originalLinks).catch((err) => {
        log.error(`Failed to restore original linked-code-indices setting: ${err}`);
      });
    }

    log.info('');
    printVariant(log, baseline!);
    log.info('');
    printVariant(log, grounded!);

    log.info('');
    log.info('='.repeat(72));
    log.info('DELTA (grounded − baseline)');
    log.info('='.repeat(72));
    const bHits = baseline!.queries.reduce((s, q) => s + (q.hits ?? 0), 0);
    const gHits = grounded!.queries.reduce((s, q) => s + (q.hits ?? 0), 0);
    const bZero = baseline!.queries.filter((q) => q.hits === 0).length;
    const gZero = grounded!.queries.filter((q) => q.hits === 0).length;
    log.info(`queries: ${baseline!.queries.length} → ${grounded!.queries.length}`);
    log.info(`total hits: ${bHits} → ${gHits}`);
    log.info(`zero-hit queries: ${bZero} → ${gZero}`);
    log.info(
      `code-evidence queries: 0 → ${grounded!.queries.filter((q) => q.hasCodeEvidence).length}`
    );

    const sameQueries =
      JSON.stringify(baseline!.queries.map((q) => q.esql).sort()) ===
      JSON.stringify(grounded!.queries.map((q) => q.esql).sort());
    if (sameQueries) {
      log.warning(
        'Baseline and grounded queries are identical — grounding likely did not run ' +
          '(check the feature flag, that the SCS tools are installed, and that the code index exists).'
      );
    }
  },
  {
    description: `
      Local A/B harness: compares Significant Events query generation for a single
      stream WITH vs WITHOUT Semantic Code Search (SCS) grounding, by toggling the
      stream's linked code index and calling the internal _generate route twice.

      Each generated query is run through the significant_events _preview API to
      report execution hit counts over the given time range.

      Prerequisites:
        - A running local Kibana + ES (config read from config/kibana.dev.yml).
        - Flag "streams.significantEventsSemanticCodeSearchGroundingEnabled" enabled.
        - SCS agentic interfaces installed (scs install-agentic-interfaces) and the
          --code-index present (e.g. produced by 'scs index <repo>').
        - The stream already has Knowledge Indicators extracted.

      Example (otel-demo):
        node scripts/sigevents_compare_code_grounding.js \\
          --stream-name logs.otel \\
          --code-index code-open-telemetry_opentelemetry-demo
    `,
    flags: {
      string: [
        'stream-name',
        'code-index',
        'connector-id',
        'from',
        'to',
        'bucket-size',
        'kibana-url',
        'es-url',
        'es-username',
        'es-password',
      ],
      help: `
        --stream-name    (required) Stream to generate queries for (e.g. logs.otel)
        --code-index     (required) SCS code index to link (e.g. code-open-telemetry_opentelemetry-demo)
        --connector-id   Optional LLM connector id (defaults to the inference feature registry)
        --from           Range start ISO date (default: now-24h)
        --to             Range end ISO date (default: now)
        --bucket-size    Preview bucket size (default: 1h)
        --kibana-url     Kibana URL (default: from kibana.dev.yml)
        --es-url         ES URL (default: from kibana.dev.yml)
        --es-username    ES username (default: from kibana.dev.yml)
        --es-password    ES password (default: from kibana.dev.yml)
      `,
    },
  }
);
