/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DataSetListItem {
  id: string;
  name: string;
  description: string;
  sourceName: string;
}

const INITIAL_ROWS: DataSetListItem[] = [
  {
    id: 'set-prod-obs',
    name: 'production-observability',
    description: 'Dashboards and rules scoped to production log and metric sources.',
    sourceName: 'logs-production',
  },
  {
    id: 'set-security',
    name: 'security-analytics-bundle',
    description: 'Detection content that reads from the dedicated security analytics cluster.',
    sourceName: 'security-analytics',
  },
  {
    id: 'set-reports',
    name: 'quarterly-reports',
    description: 'Saved searches and Canvas workpads backed by the reporting archive.',
    sourceName: 'reporting-archive',
  },
  {
    id: 'set-staging',
    name: 'staging-validation',
    description: 'Pre-release checks against staging metrics before promoting to production.',
    sourceName: 'staging-metrics',
  },
];

const cloneRows = (rows: DataSetListItem[]): DataSetListItem[] => rows.map((row) => ({ ...row }));

/** Placeholder client until data sets are fetched from the API. */
export class SampleDataSetsClient {
  private rows: DataSetListItem[];

  constructor() {
    this.rows = cloneRows(INITIAL_ROWS);
  }

  public async get(): Promise<DataSetListItem[]> {
    return cloneRows(this.rows);
  }
}
