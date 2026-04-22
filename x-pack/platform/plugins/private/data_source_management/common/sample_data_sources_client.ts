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

const INITIAL_ROWS: DataSourceListItem[] = [
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

const cloneRows = (rows: DataSourceListItem[]): DataSourceListItem[] =>
  rows.map((row) => ({ ...row }));

/** Placeholder client until data sources are fetched from the API. */
export class SampleDataSourcesClient {
  private rows: DataSourceListItem[];

  constructor() {
    this.rows = cloneRows(INITIAL_ROWS);
  }

  public get(): DataSourceListItem[] {
    return cloneRows(this.rows);
  }

  /**
   * Removes every data source whose `name` is included in `names`.
   */
  public delete(names: string | readonly string[]): void {
    const nameSet = new Set(typeof names === 'string' ? [names] : names);
    this.rows = this.rows.filter((row) => !nameSet.has(row.name));
  }
}
