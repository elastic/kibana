/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type DataSetPartitionDetection = 'none' | 'hive';

export interface DataSetListItem {
  id: string;
  name: string;
  description: string;
  sourceName: string;
  resource: string;
  partitionDetection: DataSetPartitionDetection;
}

const INITIAL_ROWS: DataSetListItem[] = [
  {
    id: 'set-prod-obs',
    name: 'production-observability',
    description: 'Dashboards and rules scoped to production log and metric sources.',
    sourceName: 'logs-production',
    resource: 's3://obs-logs-prod/**/*.parquet',
    partitionDetection: 'hive',
  },
  {
    id: 'set-prod-slo',
    name: 'production-slo-burn',
    description: 'SLO and error-budget views backed by the same production log indices.',
    sourceName: 'logs-production',
    resource: 's3://obs-logs-prod/slo/*',
    partitionDetection: 'none',
  },
  {
    id: 'set-prod-audit',
    name: 'audit-trail-readonly',
    description: 'Compliance dashboards that query immutable audit indices on this connection.',
    sourceName: 'logs-production',
    resource: 's3://obs-audit/year=*/month=*/*.parquet',
    partitionDetection: 'hive',
  },
  {
    id: 'set-security',
    name: 'security-analytics-bundle',
    description: 'Detection content that reads from the dedicated security analytics cluster.',
    sourceName: 'security-analytics',
    resource: '`detections` AS SELECT * FROM iceberg.rest.security.events',
    partitionDetection: 'none',
  },
  {
    id: 'set-security-ti',
    name: 'threat-intel-enrichment',
    description: 'Indicator feeds and enrichments stored alongside detection rules.',
    sourceName: 'security-analytics',
    resource: 'warehouse.threat_intel.indicators',
    partitionDetection: 'none',
  },
  {
    id: 'set-reports',
    name: 'quarterly-reports',
    description: 'Saved searches and Canvas workpads backed by the reporting archive.',
    sourceName: 'reporting-archive',
    resource: 'gs://reports-archive/quarterly/**/*.csv',
    partitionDetection: 'hive',
  },
  {
    id: 'set-reports-exec',
    name: 'executive-summary-packs',
    description: 'Curated monthly PDF bundles for leadership reviews.',
    sourceName: 'reporting-archive',
    resource: 'gs://reports-archive/exec/*.parquet',
    partitionDetection: 'none',
  },
  {
    id: 'set-staging',
    name: 'staging-validation',
    description: 'Pre-release checks against staging metrics before promoting to production.',
    sourceName: 'staging-metrics',
    resource: 'jdbc:postgresql://staging-db:5432/metrics',
    partitionDetection: 'none',
  },
  {
    id: 'set-staging-load',
    name: 'load-test-artifacts',
    description: 'Synthetic traffic runs and saved objects used during perf experiments.',
    sourceName: 'staging-metrics',
    resource: 'staging_metrics.load_runs',
    partitionDetection: 'none',
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

  public async add(input: {
    sourceName: string;
    datasetId: string;
    resource: string;
    description: string;
    partitionDetection: DataSetPartitionDetection;
  }): Promise<DataSetListItem> {
    const datasetId = input.datasetId.trim();
    if (!datasetId) {
      throw new Error(
        i18n.translate('dataSourceManagement.errors.dataSetIdRequired', {
          defaultMessage: 'Dataset ID is required.',
        })
      );
    }
    const resource = input.resource.trim();
    if (!resource) {
      throw new Error(
        i18n.translate('dataSourceManagement.errors.dataSetResourceRequired', {
          defaultMessage: 'Resource is required.',
        })
      );
    }
    if (this.rows.some((row) => row.sourceName === input.sourceName && row.name === datasetId)) {
      throw new Error(
        i18n.translate('dataSourceManagement.errors.duplicateDataSetId', {
          defaultMessage: 'A data set with this ID already exists for this source.',
        })
      );
    }
    const id = `set-${Date.now().toString(36)}`;
    const row: DataSetListItem = {
      id,
      name: datasetId,
      description: input.description.trim(),
      sourceName: input.sourceName,
      resource,
      partitionDetection: input.partitionDetection,
    };
    this.rows.push(row);
    return { ...row };
  }
}
