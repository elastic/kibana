/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATASET_QUALITY_API_BASE } from '../../common';

export { COMMON_HEADERS } from '../../common';

const dataStreams = `${DATASET_QUALITY_API_BASE}/data_streams`;

export const API = {
  STATS: `${dataStreams}/stats`,
  DEGRADED_DOCS: `${dataStreams}/degraded_docs`,
  FAILED_DOCS: `${dataStreams}/failed_docs`,
  TOTAL_DOCS: `${dataStreams}/total_docs`,
  TYPES_PRIVILEGES: `${dataStreams}/types_privileges`,
  INTEGRATIONS: `${DATASET_QUALITY_API_BASE}/integrations`,
  CHART_PREVIEW: `${DATASET_QUALITY_API_BASE}/rule_types/degraded_docs/chart_preview`,
  integrationDashboards: (integration: string) =>
    `${DATASET_QUALITY_API_BASE}/integrations/${integration}/dashboards`,
  details: (dataStream: string) => `${dataStreams}/${encodeURIComponent(dataStream)}/details`,
  settings: (dataStream: string) => `${dataStreams}/${encodeURIComponent(dataStream)}/settings`,
  rollover: (dataStream: string) => `${dataStreams}/${encodeURIComponent(dataStream)}/rollover`,
  integrationCheck: (dataStream: string) =>
    `${dataStreams}/${encodeURIComponent(dataStream)}/integration/check`,
  degradedFields: (dataStream: string) =>
    `${dataStreams}/${encodeURIComponent(dataStream)}/degraded_fields`,
  degradedFieldValues: (dataStream: string, field: string) =>
    `${dataStreams}/${encodeURIComponent(dataStream)}/degraded_field/${field}/values`,
  degradedFieldAnalyze: (dataStream: string, field: string) =>
    `${dataStreams}/${encodeURIComponent(dataStream)}/degraded_field/${field}/analyze`,
  failedDocsStats: (dataStream: string) =>
    `${dataStreams}/${encodeURIComponent(dataStream)}/failed_docs`,
  failedDocsErrors: (dataStream: string) =>
    `${dataStreams}/${encodeURIComponent(dataStream)}/failed_docs/errors`,
  updateFieldLimit: (dataStream: string) =>
    `${dataStreams}/${encodeURIComponent(dataStream)}/update_field_limit`,
  updateFailureStore: (dataStream: string) =>
    `${dataStreams}/${encodeURIComponent(dataStream)}/update_failure_store`,
} as const;

/** Builds a `data_streams/stats` URL with its query string. */
export const buildStatsUrl = (query: Record<string, string>): string =>
  `${API.STATS}?${new URLSearchParams(query).toString()}`;

/**
 * The metering API that backs `sizeBytes` caches for ~30s, so any assertion on a
 * size value has to poll rather than read once.
 */
export const METERING_CACHE_TIMEOUT_MS = 45_000;
