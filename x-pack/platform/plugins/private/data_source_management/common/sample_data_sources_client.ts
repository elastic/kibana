/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { DataSourceType, DataSourceWithSecrets } from './datasource_types';

export type DataSourceConnectionStatus = 'connected' | 'disconnected';

export interface DataSourceListItem {
  id: string;
  name: string;
  description: string;
  type: DataSourceType;
  status: DataSourceConnectionStatus;
  /** Full persisted config from connect flows (prototype). Used to show readonly connection fields in edit flyout. */
  persistedConfig?: Omit<DataSourceWithSecrets, 'id'>;
}

const clonePersisted = (
  persisted?: Omit<DataSourceWithSecrets, 'id'>
): Omit<DataSourceWithSecrets, 'id'> | undefined =>
  persisted
    ? (JSON.parse(JSON.stringify(persisted)) as Omit<DataSourceWithSecrets, 'id'>)
    : undefined;

const INITIAL_ROWS: DataSourceListItem[] = [
  {
    id: 'ds-logs-prod',
    name: 'logs-production',
    description: 'Read-only connection used by Observability for production log indices.',
    type: 's3',
    status: 'connected',
    persistedConfig: {
      type: 's3',
      description: 'Read-only connection used by Observability for production log indices.',
      settings: {
        region: 'us-east-1',
        endpoint: 'https://s3.us-east-1.amazonaws.com',
        auth: '',
        access_key: 'PROTOTYPE_ACCESS_KEY_ID',
        secret_key: 'PROTOTYPE_SECRET_ACCESS_KEY',
      },
    },
  },
  {
    id: 'ds-security',
    name: 'security-analytics',
    description: 'Cross-cluster search target for detection rules and alert history.',
    type: 'iceberg',
    status: 'connected',
    persistedConfig: {
      type: 'iceberg',
      description: 'Cross-cluster search target for detection rules and alert history.',
      settings: {
        region: 'eu-west-1',
        endpoint: 'https://catalog.iceberg-security.example/',
        access_key: 'PROTOTYPE_ANALYTICS_ACCESS_KEY',
        secret_key: 'PROTOTYPE_ANALYTICS_SECRET_KEY',
      },
    },
  },
  {
    id: 'ds-reports',
    name: 'reporting-archive',
    description: 'Historical CSV and PDF reports stored in a cold-tier cluster.',
    type: 'gcs',
    status: 'disconnected',
    persistedConfig: {
      type: 'gcs',
      description: 'Historical CSV and PDF reports stored in a cold-tier cluster.',
      settings: {
        project_id: 'elastic-demo-reports-prototype',
        endpoint: '',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth: '',
        credentials: { client_email: 'reports-bucket-demo@prototype.iam.gserviceaccount.com' },
      },
    },
  },
  {
    id: 'ds-stage',
    name: 'staging-metrics',
    description: 'Low-volume metrics cluster for pre-production dashboards and experiments.',
    type: 'jdbc',
    status: 'connected',
    persistedConfig: {
      type: 'jdbc',
      description: 'Low-volume metrics cluster for pre-production dashboards and experiments.',
      settings: {
        host: 'staging-metrics-db.example.local',
        port: '5432',
        database: 'metrics_preview',
        ssl: true,
        username: 'read_metrics',
        password: 'PROTOTYPE_JDBC_PASSWORD',
      },
    },
  },
  {
    id: 'ds-fleet',
    name: 'fleet-ingest',
    description: 'Elasticsearch endpoint receiving Elastic Agent documents and fleet metadata.',
    type: 'flight',
    status: 'disconnected',
    persistedConfig: {
      type: 'flight',
      description: 'Elasticsearch endpoint receiving Elastic Agent documents and fleet metadata.',
      settings: {
        host: 'fleet-cluster.internal.elastic',
        port: 9240,
      },
    },
  },
];

const cloneRows = (rows: DataSourceListItem[]): DataSourceListItem[] =>
  rows.map((row) => ({
    ...row,
    persistedConfig: clonePersisted(row.persistedConfig),
  }));

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
      status: 'connected',
      persistedConfig: clonePersisted(input.dataSource),
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
    const prev = this.rows[idx];
    const trimmed = description.trim();
    let nextPersisted = prev.persistedConfig;
    if (nextPersisted) {
      nextPersisted = {
        ...(JSON.parse(JSON.stringify(nextPersisted)) as Omit<DataSourceWithSecrets, 'id'>),
        description: trimmed,
      };
    }
    const next = {
      ...prev,
      description: trimmed,
      persistedConfig: nextPersisted ?? prev.persistedConfig,
    };
    this.rows[idx] = next;
    return { ...next };
  }
}
