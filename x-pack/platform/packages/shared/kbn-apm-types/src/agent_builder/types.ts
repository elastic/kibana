/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';

const DEFAULT_TIME_RANGE = { start: 'now-1h', end: 'now' };

/**
 * Canonical request schema for the agent-builder `get_services` capability.
 * Used by the inline tool, the HTTP route, the service function, and the
 * data-registry consumer — all four converge on this single definition.
 */
export const getServicesRequestSchema = z.object({
  start: z
    .string()
    .max(100)
    .describe(
      `The start time of the query window using Elasticsearch date math. Examples: "now-24h", "now-15m". Defaults to ${DEFAULT_TIME_RANGE.start}.`
    )
    .default(DEFAULT_TIME_RANGE.start),
  end: z
    .string()
    .max(100)
    .describe(
      `The end time of the query window using Elasticsearch date math. Example: "now". Defaults to ${DEFAULT_TIME_RANGE.end}.`
    )
    .default(DEFAULT_TIME_RANGE.end),
  anomalySeverities: z
    .array(
      z.enum([
        ML_ANOMALY_SEVERITY.CRITICAL,
        ML_ANOMALY_SEVERITY.MAJOR,
        ML_ANOMALY_SEVERITY.MINOR,
        ML_ANOMALY_SEVERITY.WARNING,
        ML_ANOMALY_SEVERITY.LOW,
        ML_ANOMALY_SEVERITY.UNKNOWN,
      ])
    )
    .optional()
    .describe(
      'Filter APM services by ML anomaly severity derived from anomalyScore. Example: ["critical", "major"].'
    ),
  kqlFilter: z
    .string()
    .max(1000)
    .optional()
    .describe(
      'KQL filter to narrow down services. Examples: "host.name: web-server-01", "service.name: frontend".'
    ),
});

export type GetServicesRequest = z.infer<typeof getServicesRequestSchema>;

/**
 * Shape of a single service row returned by the agent-builder `get_services`
 * capability. Declared here (rather than in the APM plugin) so it's
 * importable by consumers outside the APM plugin without crossing plugin
 * boundaries.
 */
export interface GetServicesItem {
  serviceName: string;
  transactionType?: string;
  environments?: string[];
  agentName?: string;
  /** Latency in milliseconds. */
  latency?: number | null;
  transactionErrorRate?: number;
  throughput?: number;
  anomalyScore?: number;
  anomalySeverity?: ML_ANOMALY_SEVERITY;
  alertsCount?: number;
}

export interface GetServicesResponse {
  services: GetServicesItem[];
  maxCountExceeded: boolean;
  serviceOverflowCount: number;
}
