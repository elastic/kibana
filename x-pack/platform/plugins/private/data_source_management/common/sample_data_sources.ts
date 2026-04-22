/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DataSourceListItem {
  id: string;
  name: string;
  description: string;
}

/** Sample rows until data sources are loaded from the API. */
export const SAMPLE_DATA_SOURCES: DataSourceListItem[] = [
  {
    id: 'ds-logs-prod',
    name: 'logs-production',
    description: 'Read-only connection used by Observability for production log indices.',
  },
  {
    id: 'ds-security',
    name: 'security-analytics',
    description: 'Cross-cluster search target for detection rules and alert history.',
  },
  {
    id: 'ds-reports',
    name: 'reporting-archive',
    description: 'Historical CSV and PDF reports stored in a cold-tier cluster.',
  },
  {
    id: 'ds-stage',
    name: 'staging-metrics',
    description: 'Low-volume metrics cluster for pre-production dashboards and experiments.',
  },
  {
    id: 'ds-fleet',
    name: 'fleet-ingest',
    description: 'Elasticsearch endpoint receiving Elastic Agent documents and fleet metadata.',
  },
];
