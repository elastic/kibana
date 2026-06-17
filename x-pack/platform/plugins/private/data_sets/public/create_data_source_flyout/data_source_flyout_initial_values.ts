/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSource, DataSourceWithSecrets } from '../../common/datasource_types';
import type { CreateDataSourceAuthenticationMode } from './create_data_source_flyout_authentication';
import { getDefaultAuthenticationMode } from './create_data_source_flyout_authentication';
import type { CreateDataSourceFlyoutFormValues } from './create_data_source_flyout_form_state';

export const emptyDataSourceFlyoutFormValues = (): CreateDataSourceFlyoutFormValues => ({
  name: '',
  description: '',
  settings: {},
});

/** Maps a list-table row to flyout initial state (no extra GET). */
export const dataSourceFromListItem = (item: DataSource): DataSourceWithSecrets =>
  ({
    ...item,
    description: item.description ?? '',
    settings: asSettingsRecord(item.settings),
  } as DataSourceWithSecrets);

const asSettingsRecord = (
  settings: DataSourceWithSecrets['settings'] | undefined | null
): Record<string, unknown> => {
  if (settings === undefined || settings === null || typeof settings !== 'object') {
    return {};
  }
  return settings as Record<string, unknown>;
};

const settingsToFormValues = (
  settings: DataSourceWithSecrets['settings'] | undefined | null
): CreateDataSourceFlyoutFormValues['settings'] => {
  const result: Record<string, string | boolean> = {};

  for (const [key, value] of Object.entries(asSettingsRecord(settings))) {
    if (value === undefined || value === null) {
      continue;
    }
    if (key === 'ssl' && typeof value === 'boolean') {
      result[key] = value;
      continue;
    }
    if (typeof value === 'object') {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = String(value);
    }
  }

  return result as CreateDataSourceFlyoutFormValues['settings'];
};

export const dataSourceToFlyoutFormValues = (
  data: DataSourceWithSecrets
): CreateDataSourceFlyoutFormValues => ({
  name: data.name,
  description: data.description ?? '',
  settings: settingsToFormValues(data.settings),
});

export const authenticationModeFromDataSource = (
  data: DataSourceWithSecrets
): CreateDataSourceAuthenticationMode => {
  const settings = asSettingsRecord(data.settings);

  if (data.type === 'azure') {
    if (typeof settings.connection_string === 'string' && settings.connection_string.trim()) {
      return 'connection_string';
    }
    if (typeof settings.sas_token === 'string' && settings.sas_token.trim()) {
      return 'sas_token';
    }
    if (
      (typeof settings.key === 'string' && settings.key.trim()) ||
      (typeof settings.account === 'string' && settings.account.trim())
    ) {
      return 'credentials';
    }
    return 'credentials';
  }

  if (data.type === 'gcs') {
    const { credentials } = settings;
    const hasCredentials =
      typeof credentials === 'string'
        ? credentials.trim() !== ''
        : credentials !== undefined && credentials !== null;
    if (hasCredentials) {
      return 'access_and_secret_keys';
    }
    return 'access_and_secret_keys';
  }

  if (data.type === 's3') {
    if (
      (typeof settings.access_key === 'string' && settings.access_key.trim()) ||
      (typeof settings.secret_key === 'string' && settings.secret_key.trim())
    ) {
      return 'access_and_secret_keys';
    }
    return 'access_and_secret_keys';
  }

  return getDefaultAuthenticationMode(data.type);
};
