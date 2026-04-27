/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { DataSourceType, DataSourceWithSecrets } from './datasource_types';

export interface DataSourceListItem {
  id: string;
  name: string;
  description: string;
  type: DataSourceType;
}

const INITIAL_ROWS: DataSourceListItem[] = [
  {
    id: 'ds-logs-prod',
    name: 'logs-production',
    description: 'Read-only connection used by Observability for production log indices.',
    type: 's3',
  },
  {
    id: 'ds-security',
    name: 'security-analytics',
    description: 'Cross-cluster search target for detection rules and alert history.',
    type: 'iceberg',
  },
  {
    id: 'ds-reports',
    name: 'reporting-archive',
    description: 'Historical CSV and PDF reports stored in a cold-tier cluster.',
    type: 'gcs',
  },
  {
    id: 'ds-stage',
    name: 'staging-metrics',
    description: 'Low-volume metrics cluster for pre-production dashboards and experiments.',
    type: 'jdbc',
  },
  {
    id: 'ds-fleet',
    name: 'fleet-ingest',
    description: 'Elasticsearch endpoint receiving Elastic Agent documents and fleet metadata.',
    type: 'flight',
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

  public async get(): Promise<DataSourceListItem[]> {
    return cloneRows(this.rows);
  }

  public async add(input: {
    name: string;
    dataSource: Omit<DataSourceWithSecrets, 'id'>;
  }): Promise<DataSourceListItem> {
    const name = input.name.trim();
    if (!name) {
      throw new Error(
        i18n.translate('dataSourceManagement.errors.nameRequired', {
          defaultMessage: 'Name is required.',
        })
      );
    }
    if (this.rows.some((row) => row.name === name)) {
      throw new Error(
        i18n.translate('dataSourceManagement.errors.duplicateName', {
          defaultMessage: 'A data source with this name already exists.',
        })
      );
    }
    const id = `ds-${Date.now().toString(36)}`;
    const row: DataSourceListItem = {
      id,
      name,
      description: input.dataSource.description,
      type: input.dataSource.type,
    };
    this.rows.push(row);
    return { ...row };
  }

  /**
   * Removes every data source whose `name` is included in `names`.
   */
  public async delete(names: string | readonly string[]): Promise<void> {
    const nameSet = new Set(typeof names === 'string' ? [names] : names);
    this.rows = this.rows.filter((row) => !nameSet.has(row.name));
  }
}
