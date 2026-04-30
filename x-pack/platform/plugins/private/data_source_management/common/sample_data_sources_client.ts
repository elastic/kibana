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

  /**
   * Adds a catalog row for a connector that was created in Stack Management (prototype bridge).
   */
  public async addFromKibanaConnector(connectorName: string): Promise<DataSourceListItem> {
    const name = connectorName.trim();
    return this.add({
      name,
      dataSource: {
        type: 'flight',
        description: i18n.translate('dataSourceManagement.sampleClient.fromConnectorDescription', {
          defaultMessage: 'Registered from a Stack Management connector.',
        }),
        settings: {
          host: 'localhost',
          port: 443,
        },
      },
    });
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

  /** Updates the description of the data source with the given `id`. */
  public async updateDescription(id: string, description: string): Promise<DataSourceListItem> {
    const idx = this.rows.findIndex((row) => row.id === id);
    if (idx === -1) {
      throw new Error(
        i18n.translate('dataSourceManagement.errors.sourceNotFound', {
          defaultMessage: 'Data source not found.',
        })
      );
    }
    const next = { ...this.rows[idx], description };
    this.rows[idx] = next;
    return { ...next };
  }
}
