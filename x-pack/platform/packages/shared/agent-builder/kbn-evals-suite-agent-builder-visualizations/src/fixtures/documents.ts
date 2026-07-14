/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OTEL_METRICS_INDEX } from './indices';

interface OtelMetricsDocument {
  '@timestamp': string;
  host: { name: string };
  system: { cpu: { load_average: { '1m': number; '5m': number; '15m': number } } };
}

/**
 * Number of most-recent hours to seed (one sample per host per hour).
 */
export const OTEL_METRICS_SAMPLE_HOURS = 12;

const HOSTS = ['host-a', 'host-b'] as const;

/**
 * Build deterministic OTel host-metrics samples ending at `now`, one per
 * host per hour for the last {@link OTEL_METRICS_SAMPLE_HOURS} hours.
 *
 * Timestamps are **now-relative** (not a fixed calendar date) so the
 * fixture always lands inside the evaluators' now-relative bind-param
 * window (see `../evaluators/esql_bind_params.ts`) and inside the TSDB
 * index's accepted time range (see `./indices.ts`). The values are
 * deterministic so the gold-query result set is stable across runs.
 */
export function buildOtelMetricsDocuments(now: number = Date.now()): OtelMetricsDocument[] {
  const documents: OtelMetricsDocument[] = [];
  // Align to the top of the current hour so bucket boundaries are stable.
  const topOfHour = Math.floor(now / (60 * 60 * 1000)) * 60 * 60 * 1000;

  for (let hour = 0; hour < OTEL_METRICS_SAMPLE_HOURS; hour++) {
    const timestamp = new Date(topOfHour - hour * 60 * 60 * 1000).toISOString();
    HOSTS.forEach((host, hostIndex) => {
      const load1m = 0.5 + hostIndex * 0.4 + hour * 0.05;
      documents.push({
        '@timestamp': timestamp,
        host: { name: host },
        system: {
          cpu: {
            load_average: {
              '1m': Number(load1m.toFixed(3)),
              '5m': Number((load1m * 0.9).toFixed(3)),
              '15m': Number((load1m * 0.8).toFixed(3)),
            },
          },
        },
      });
    });
  }

  return documents;
}

/**
 * Flatten the samples into a bulk `create` operation stream for the OTel
 * metrics index.
 */
export function buildOtelMetricsBulkOperations(
  now: number = Date.now()
): Array<{ create: { _index: string } } | OtelMetricsDocument> {
  return buildOtelMetricsDocuments(now).flatMap((document) => [
    { create: { _index: OTEL_METRICS_INDEX } },
    document,
  ]);
}
