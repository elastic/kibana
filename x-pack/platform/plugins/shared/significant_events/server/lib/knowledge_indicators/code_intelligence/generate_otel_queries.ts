/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import {
  QUERY_TYPE_MATCH,
  QUERY_TYPE_STATS,
  type StreamQuery,
} from '@kbn/significant-events-schema';
import type { OtelMetricKind, OtelSignal, OtelSignalCounts, OtelSignalKind } from './types';

const OTEL_QUERY_NAMESPACE = 'dfcdbec1-93a0-5c3a-8805-0ad6095f1100';

export type OtelQueryTier = OtelSignalKind | 'grpc_failure' | 'instrumented_error_status';

export interface OtelQueryCandidate {
  query: StreamQuery;
  tier: OtelQueryTier;
  field: string;
  source: OtelSignal;
  stream: string;
}

export interface GenerateOtelQueriesResult {
  queries: OtelQueryCandidate[];
  gateBypassed: boolean;
}

const escapeString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
const escapeIdentifier = (value: string): string => value.replace(/`/g, '``');
const fieldIdentifier = (prefix: string, value: string): string =>
  `\`${escapeIdentifier(`${prefix}.${value}`)}\``;
const sources = (streams: string[]): string => streams.join(',');

/**
 * TSDB time-series aggregation for a metric field, run under the `TS` source
 * command (metrics-* is index.mode=time_series). The clause is chosen from the
 * *source* instrument kind — the query represents what the code instruments, not
 * how a given cluster's ingestion happens to map it:
 *
 *   counter               -> SUM(RATE(field))            (monotonic: rate per series, then sum)
 *   histogram             -> AVG(PERCENTILE_OVER_TIME())  (p95 over the window)
 *   gauge / up-down / ?   -> AVG(AVG_OVER_TIME(field))    (level over the window)
 *
 * Rationale (see project memory): a correctly-typed Elasticsearch mapping (ES now
 * fully supports counter + histogram TSDB types) runs these as-is — verified on a
 * live collector where source counters ingest as `counter` and RATE() works. A
 * lossy/outdated ingestion that downgrades counters to gauge will make the counter
 * query error, which surfaces the misconfiguration loudly rather than returning a
 * meaningless AVG-of-a-cumulative-counter. Non-monotonic up-down counters are a
 * level, not a rate, so they use AVG_OVER_TIME. Unknown kind defaults to the
 * gauge-safe level (the extractor tags a kind for every instrument it matches).
 */
const metricStatsClause = (field: string, kind: OtelMetricKind | undefined): string => {
  switch (kind) {
    case 'counter':
      return `rate = SUM(RATE(${field}))`;
    case 'histogram':
      return `p95 = AVG(PERCENTILE_OVER_TIME(${field}, 95))`;
    case 'gauge':
    case 'updown':
    default:
      return `avg = AVG(AVG_OVER_TIME(${field}))`;
  }
};

const severityForTier = (tier: OtelQueryTier): number =>
  tier === 'error_status' ||
  tier === 'record_exception' ||
  tier === 'grpc_failure' ||
  tier === 'instrumented_error_status'
    ? 80
    : 50;

const defaultTitle = (serviceName: string, tier: OtelQueryTier, field: string): string =>
  `${serviceName}: ${tier.replace(/_/g, ' ')} ${field}`;

/** Deterministically maps extracted OTel signals and resolved streams to typed ES|QL. */
export function generateOtelQueries({
  serviceName,
  repository,
  gitSha,
  signals,
  signalCounts,
  traceStreams,
  metricStreams,
  logStreams,
}: {
  serviceName: string;
  repository: string;
  gitSha: string;
  signals: OtelSignal[];
  signalCounts: OtelSignalCounts;
  traceStreams: string[];
  metricStreams: string[];
  logStreams: string[];
}): GenerateOtelQueriesResult {
  const candidates: OtelQueryCandidate[] = [];
  const seen = new Set<string>();
  const add = ({
    esql,
    tier,
    field,
    source,
    stream,
  }: {
    esql: string;
    tier: OtelQueryTier;
    field: string;
    source: OtelSignal;
    stream: string;
  }) => {
    if (seen.has(esql)) return;
    seen.add(esql);
    const evidence = `code: ${repository}@${gitSha}:${source.file}:${source.line} tier=${tier}`;
    candidates.push({
      tier,
      field,
      source,
      stream,
      query: {
        id: uuidv5(`${serviceName}:${esql}`, OTEL_QUERY_NAMESPACE),
        type: esql.includes('| STATS ') ? QUERY_TYPE_STATS : QUERY_TYPE_MATCH,
        title: defaultTitle(serviceName, tier, field),
        description: `Predictive typed OTel query for ${tier.replace(
          /_/g,
          ' '
        )} in service "${serviceName}".`,
        esql: { query: esql },
        severity_score: severityForTier(tier),
        evidence: [evidence],
      },
    });
  };

  for (const signal of signals) {
    if (signal.templated) continue;
    const value = signal.value ? escapeString(signal.value) : undefined;
    switch (signal.kind) {
      case 'error_status':
        if (traceStreams.length > 0) {
          add({
            esql: `FROM ${sources(
              traceStreams
            )} | WHERE status.code == "Error" | STATS c = COUNT(*) BY name`,
            tier: signal.kind,
            field: 'status.code',
            source: signal,
            stream: traceStreams[0],
          });
          add({
            esql: `FROM ${sources(
              traceStreams
            )} | WHERE status.code == "Error" | STATS p95_latency = PERCENTILE(duration, 95) BY name`,
            tier: signal.kind,
            field: 'duration',
            source: signal,
            stream: traceStreams[0],
          });
        }
        break;
      case 'record_exception':
        if (logStreams.length > 0) {
          add({
            esql: `FROM ${sources(
              logStreams
            )} | WHERE attributes.exception.type IS NOT NULL | STATS c = COUNT(*) BY attributes.exception.type`,
            tier: signal.kind,
            field: 'attributes.exception.type',
            source: signal,
            stream: logStreams[0],
          });
        }
        break;
      case 'span_name':
        if (value && traceStreams.length > 0) {
          add({
            esql: `FROM ${sources(
              traceStreams
            )} | WHERE name == "${value}" | STATS total = COUNT(*), errors = COUNT(*) WHERE status.code == "Error"`,
            tier: signal.kind,
            field: signal.value!,
            source: signal,
            stream: traceStreams[0],
          });
          add({
            esql: `FROM ${sources(
              traceStreams
            )} | WHERE name == "${value}" | STATS p95_latency = PERCENTILE(duration, 95)`,
            tier: signal.kind,
            field: signal.value!,
            source: signal,
            stream: traceStreams[0],
          });
        }
        break;
      case 'event_name':
        if (value && logStreams.length > 0) {
          add({
            esql: `FROM ${sources(logStreams)} | WHERE event_name == "${value}"`,
            tier: signal.kind,
            field: signal.value!,
            source: signal,
            stream: logStreams[0],
          });
        }
        break;
      case 'attr_key': {
        if (!signal.value || traceStreams.length === 0) break;
        const field = fieldIdentifier('attributes', signal.value);
        let esql: string;
        if (signal.valueHint === 'bool') {
          esql = `FROM ${sources(traceStreams)} | WHERE ${field} == false`;
        } else if (signal.valueHint === 'number') {
          esql = `FROM ${sources(
            traceStreams
          )} | WHERE ${field} IS NOT NULL | STATS avg = AVG(${field}), max = MAX(${field}), p95 = PERCENTILE(${field}, 95)`;
        } else {
          esql = `FROM ${sources(
            traceStreams
          )} | WHERE ${field} IS NOT NULL | STATS c = COUNT(*) BY ${field}`;
        }
        add({ esql, tier: signal.kind, field, source: signal, stream: traceStreams[0] });
        break;
      }
      case 'metric_name': {
        if (!signal.value || !value || metricStreams.length === 0) break;
        const field = fieldIdentifier('metrics', signal.value);
        add({
          // metrics-* is index.mode=time_series (TSDB): TS source + a time-series
          // aggregation chosen from the source instrument kind (see metricStatsClause).
          esql: `TS ${sources(
            metricStreams
          )} | WHERE ${field} IS NOT NULL | STATS ${metricStatsClause(field, signal.metricKind)}`,
          tier: signal.kind,
          field,
          source: signal,
          stream: metricStreams[0],
        });
        break;
      }
    }
  }

  if (
    (signalCounts.instrumentation_grpc > 0 || signalCounts.instrumentation_http > 0) &&
    traceStreams.length > 0
  ) {
    const source: OtelSignal = {
      kind: 'error_status',
      language: 'unknown',
      file: '',
      line: 0,
    };
    add({
      esql: `FROM ${sources(
        traceStreams
      )} | WHERE status.code == "Error" | STATS c = COUNT(*) BY name`,
      tier: 'instrumented_error_status',
      field: 'status.code',
      source,
      stream: traceStreams[0],
    });
    add({
      esql: `FROM ${sources(
        traceStreams
      )} | WHERE attributes.rpc.grpc.status_code IS NOT NULL AND attributes.rpc.grpc.status_code != 0 | STATS c = COUNT(*) BY name`,
      tier: 'grpc_failure',
      field: 'attributes.rpc.grpc.status_code',
      source,
      stream: traceStreams[0],
    });
  }

  const hasResolvableSignalTier = signals.some((signal) => {
    if (signal.templated) return false;
    if (
      signal.kind === 'span_name' ||
      signal.kind === 'attr_key' ||
      signal.kind === 'error_status'
    ) {
      return traceStreams.length > 0;
    }
    if (signal.kind === 'metric_name') return metricStreams.length > 0;
    return logStreams.length > 0;
  });
  const instrumentationHasTraceTier =
    (signalCounts.instrumentation_grpc > 0 || signalCounts.instrumentation_http > 0) &&
    traceStreams.length > 0;
  return {
    queries: candidates,
    gateBypassed: !hasResolvableSignalTier && !instrumentationHasTraceTier,
  };
}
