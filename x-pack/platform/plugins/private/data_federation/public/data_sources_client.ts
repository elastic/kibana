/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { isNil, omit, omitBy } from 'lodash';
import type { DataSourceType, DataSourceWithSecrets } from '../common';
import {
  DATA_SOURCES_LIST_ROUTE_PATH,
  ES_REDACTED_SECRET_VALUE,
  SECRET_FIELDS_BY_TYPE,
  UI_MANAGED_SECRET_FIELDS_BY_TYPE,
  getDataSourceByIdApiPath,
  type DataSource,
} from '../common';

interface GetDataSourcesResponse {
  data_sources: DataSource[];
}

const isEmptyValue = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

function omitEmptySettingsFields(settings: object): Record<string, unknown> {
  return omitBy(settings as Record<string, unknown>, isEmptyValue);
}

/**
 * Builds the settings body for updating an existing data source. Elasticsearch gives
 * secret fields (SECRET_FIELDS_BY_TYPE) PUT merge semantics: omitting one keeps the
 * stored value, an explicit `null` clears it, a value replaces it. So an untouched
 * redacted field must be omitted (never echoed back), and a field the UI dropped (e.g.
 * an auth-mode switch away from credentials) must be nulled rather than merely absent.
 * Plaintext fields keep the existing full-replace-when-present behavior.
 *
 * Only fields in UI_MANAGED_SECRET_FIELDS_BY_TYPE get nulled when absent — secret fields
 * the flyout doesn't expose (e.g. Azure's connection_string/sas_token) are never part of
 * the submitted settings regardless of whether the stored data source has them set, so
 * treating their absence as "the user cleared it" would silently wipe them on every save.
 */
function buildUpdateSettings(
  dataSourceType: DataSourceType,
  settings: object
): Record<string, unknown> {
  const secretFields = SECRET_FIELDS_BY_TYPE[dataSourceType];
  const uiManagedSecretFields = UI_MANAGED_SECRET_FIELDS_BY_TYPE[dataSourceType];
  const settingsRecord = settings as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(settingsRecord)) {
    if (secretFields.includes(key)) {
      if (value === ES_REDACTED_SECRET_VALUE) {
        continue;
      }
      result[key] = isEmptyValue(value) ? null : value;
      continue;
    }

    if (!isEmptyValue(value)) {
      result[key] = value;
    }
  }

  for (const key of uiManagedSecretFields) {
    if (!(key in settingsRecord)) {
      result[key] = null;
    }
  }

  return result;
}

/**
 * Browser client for data source management HTTP APIs (mirrors {@link SampleDataSourcesClient}).
 * Uses internal routes that proxy to Elasticsearch.
 */
export class DataSourcesClient {
  constructor(private readonly http: HttpStart) {}

  public async get(): Promise<DataSource[]> {
    const body = await this.http.get<GetDataSourcesResponse>(DATA_SOURCES_LIST_ROUTE_PATH);
    return body.data_sources;
  }

  public async getById(id: string): Promise<DataSource> {
    const trimmed = id.trim();
    if (!trimmed) {
      throw new Error(
        i18n.translate('xpack.dataFederation.errors.idRequired', {
          defaultMessage: 'Name is required.',
        })
      );
    }

    return await this.http.get<DataSource>(getDataSourceByIdApiPath(trimmed));
  }

  public async add(dataSource: DataSourceWithSecrets): Promise<void> {
    const { name } = dataSource;
    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      throw new Error(
        i18n.translate('xpack.dataFederation.errors.idRequired', {
          defaultMessage: 'Name is required.',
        })
      );
    }

    const withoutName = omit(dataSource, 'name');
    const body = omitBy<Omit<DataSourceWithSecrets, 'name'>>(
      {
        ...withoutName,
        settings: omitEmptySettingsFields(dataSource.settings),
      },
      isNil
    );

    await this.http.put(getDataSourceByIdApiPath(nameTrimmed), {
      body: JSON.stringify(body),
    });
  }

  /**
   * Updates an existing data source. Unlike {@link DataSourcesClient.add}, this never
   * echoes a redacted secret field back to Elasticsearch (see {@link buildUpdateSettings}),
   * so an edit-and-save that doesn't touch a credential can't overwrite it.
   */
  public async update(dataSource: DataSourceWithSecrets): Promise<void> {
    const { name } = dataSource;
    const nameTrimmed = name.trim();
    if (!nameTrimmed) {
      throw new Error(
        i18n.translate('xpack.dataFederation.errors.idRequired', {
          defaultMessage: 'Name is required.',
        })
      );
    }

    const { name: _name, ...withoutName } = dataSource;
    const body: Omit<DataSourceWithSecrets, 'name'> = {
      ...withoutName,
      settings: buildUpdateSettings(dataSource.type, dataSource.settings),
    };
    await this.http.put(getDataSourceByIdApiPath(nameTrimmed), {
      body: JSON.stringify(body),
    });
  }

  /**
   * Deletes each data source whose `name` matches the given name(s).
   * Names are sent as the path id (same convention as {@link DataSourcesClient.add}).
   */
  public async delete(names: string | readonly string[]): Promise<void> {
    const list = typeof names === 'string' ? [names] : names;
    await Promise.all(list.map((name) => this.http.delete(getDataSourceByIdApiPath(name))));
  }
}
