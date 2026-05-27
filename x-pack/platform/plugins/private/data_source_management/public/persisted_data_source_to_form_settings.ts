/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceWithSecrets } from '../common';
import {
  emptyCreateDataSourceFormSettings,
  type CreateDataSourceFlyoutFormSettings,
} from './create_data_source_flyout_form_state';

/**
 * Hydrates flyout form state from the stored data source payload (prototype / sample client).
 */
export function persistedDataSourceToFormSettings(
  data: Omit<DataSourceWithSecrets, 'id'>
): CreateDataSourceFlyoutFormSettings {
  const base = emptyCreateDataSourceFormSettings();
  switch (data.type) {
    case 's3': {
      const st = data.settings;
      return {
        ...base,
        s3: {
          region: st.region ?? '',
          endpoint: st.endpoint ?? '',
          auth: st.auth ?? '',
          access_key: st.access_key ?? '',
          secret_key: st.secret_key ?? '',
        },
      };
    }
    case 'gcs': {
      const st = data.settings;
      let credentialsJson = '';
      try {
        if (st.credentials != null && Object.keys(st.credentials as object).length > 0) {
          credentialsJson = JSON.stringify(st.credentials, null, 2);
        }
      } catch {
        credentialsJson = '';
      }
      return {
        ...base,
        gcs: {
          project_id: st.project_id ?? '',
          endpoint: st.endpoint ?? '',
          token_uri: st.token_uri ?? '',
          auth: st.auth ?? '',
          credentialsJson,
        },
      };
    }
    case 'azure_blob': {
      const st = data.settings;
      return {
        ...base,
        azure_blob: {
          endpoint: st.endpoint ?? '',
          account: st.account ?? '',
          auth: st.auth ?? '',
          connection_string: st.connection_string ?? '',
          key: st.key ?? '',
          sas_token: st.sas_token ?? '',
        },
      };
    }
    case 'iceberg': {
      const st = data.settings;
      return {
        ...base,
        iceberg: {
          region: st.region ?? '',
          endpoint: st.endpoint ?? '',
          access_key: st.access_key ?? '',
          secret_key: st.secret_key ?? '',
        },
      };
    }
    case 'jdbc': {
      const st = data.settings;
      return {
        ...base,
        jdbc: {
          host: st.host ?? '',
          port: st.port ?? '',
          database: st.database ?? '',
          ssl: Boolean(st.ssl),
          username: st.username ?? '',
          password: st.password ?? '',
        },
      };
    }
    case 'flight': {
      const st = data.settings;
      return {
        ...base,
        flight: {
          host: st.host ?? '',
          port:
            typeof st.port === 'number'
              ? String(st.port)
              : typeof st.port === 'string'
              ? st.port
              : '',
        },
      };
    }
  }
}
