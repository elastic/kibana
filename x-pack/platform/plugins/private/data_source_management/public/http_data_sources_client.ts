/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import omit from 'lodash/omit';

import type { DataSourceType, DataSourceWithSecrets } from '../common';
import {
  ALL_DATA_SOURCE_TYPES,
  DATA_SOURCES_LIST_ROUTE_PATH,
  getDataSourceByIdApiPath,
  type DataSource,
} from '../common';
import type { DataSourceListItem } from '../common/sample_data_sources_client';

function isDataSourceType(value: unknown): value is DataSourceType {
  return typeof value === 'string' && (ALL_DATA_SOURCE_TYPES as readonly string[]).includes(value);
}

function normalizeListRow(row: unknown): DataSourceListItem | null {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : null;
  if (!id) {
    return null;
  }
  const description = typeof o.description === 'string' ? o.description : '';
  if (!isDataSourceType(o.type)) {
    return null;
  }
  const name = typeof o.name === 'string' ? o.name : id;
  return { id, name, description, type: o.type };
}

interface GetDataSourcesResponse {
  data_sources: DataSource[];
}
/**
 * Browser client for data source management HTTP APIs (mirrors {@link SampleDataSourcesClient}).
 * Uses internal routes that proxy to Elasticsearch.
 */
export class HttpDataSourcesClient {
  constructor(private readonly http: HttpStart) {}

  public async get(): Promise<DataSource[]> {
    const body = await this.http.get<GetDataSourcesResponse>(DATA_SOURCES_LIST_ROUTE_PATH);
    return body.data_sources;
  }

  public async add(dataSource: DataSourceWithSecrets): Promise<void> {
    const { name } = dataSource;
    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      throw new Error(
        i18n.translate('dataSourceManagement.errors.idRequired', {
          defaultMessage: 'Name is required.',
        })
      );
    }
    // todo check if data source already exists
    /*
    const existing = await this.get();
    if (existing.some((row) => row.name === name)) {
      throw new Error(
        i18n.translate('dataSourceManagement.errors.duplicateName', {
          defaultMessage: 'A data source with this name already exists.',
        })
      );
    }
      */
    console.log('dataSource', dataSource);
    await this.http.put(getDataSourceByIdApiPath(nameTrimmed), {
      body: JSON.stringify(omit(dataSource, ['name'])),
    });
  }

  /**
   * Deletes each data source whose `name` matches the given name(s).
   * Names are sent as the path id (same convention as {@link HttpDataSourcesClient.add}).
   */
  public async delete(names: string | readonly string[]): Promise<void> {
    const list = typeof names === 'string' ? [names] : [...names];
    await Promise.all(list.map((name) => this.http.delete(getDataSourceByIdApiPath(name))));
  }
}
