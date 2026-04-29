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
    id: 'set-prod-slo',
    name: 'production-slo-burn',
    description: 'SLO and error-budget views backed by the same production log indices.',
    sourceName: 'logs-production',
  },
  {
    id: 'set-prod-audit',
    name: 'audit-trail-readonly',
    description: 'Compliance dashboards that query immutable audit indices on this connection.',
    sourceName: 'logs-production',
  },
  {
    id: 'set-security',
    name: 'security-analytics-bundle',
    description: 'Detection content that reads from the dedicated security analytics cluster.',
    sourceName: 'security-analytics',
  },
  {
    id: 'set-security-ti',
    name: 'threat-intel-enrichment',
    description: 'Indicator feeds and enrichments stored alongside detection rules.',
    sourceName: 'security-analytics',
  },
  {
    id: 'set-reports',
    name: 'quarterly-reports',
    description: 'Saved searches and Canvas workpads backed by the reporting archive.',
    sourceName: 'reporting-archive',
  },
  {
    id: 'set-reports-exec',
    name: 'executive-summary-packs',
    description: 'Curated monthly PDF bundles for leadership reviews.',
    sourceName: 'reporting-archive',
  },
  {
    id: 'set-staging',
    name: 'staging-validation',
    description: 'Pre-release checks against staging metrics before promoting to production.',
    sourceName: 'staging-metrics',
  },
  {
    id: 'set-staging-load',
    name: 'load-test-artifacts',
    description: 'Synthetic traffic runs and saved objects used during perf experiments.',
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

  public async delete(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.rows = this.rows.filter((row) => !idSet.has(row.id));
  }

  /** Removes every data set tied to a given source name (e.g. when the source is deleted). */
  public async deleteBySourceName(sourceName: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.sourceName !== sourceName);
  }
}
