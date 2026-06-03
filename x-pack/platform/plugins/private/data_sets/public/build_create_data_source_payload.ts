/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceWithSecrets } from '../common';
import type { DataSourceType } from '../common/datasource_types';
import type { CreateDataSourceFlyoutFormSettings } from './create_data_source_flyout/create_data_source_flyout_form_state';

const s = (v: string): string | undefined => {
  const t = v.trim();
  return t === '' ? undefined : t;
};

export interface BuildPayloadError {
  type: 'validation';
  message: string;
}

export function buildOmitIdDataSource(
  name: string,
  description: string,
  dataSourceType: DataSourceType,
  form: CreateDataSourceFlyoutFormSettings
): { dataSource: Omit<DataSourceWithSecrets, 'id'>; error?: undefined } | BuildPayloadError {
  const desc = description.trim();
  const nameTrim = name.trim();
  if (!nameTrim) {
    return { type: 'validation', message: 'Name is required.' };
  }
  if (!desc) {
    return { type: 'validation', message: 'Description is required.' };
  }

  switch (dataSourceType) {
    case 's3': {
      const { s3: v } = form;
      return {
        dataSource: {
          type: 's3',
          description: desc,
          settings: {
            ...pickStrings(v, ['region', 'endpoint', 'auth', 'access_key', 'secret_key'] as const),
          },
        },
      };
    }
    case 'gcs': {
      const { gcs } = form;
      let credentials: {} | undefined;
      const raw = gcs.credentialsJson.trim();
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return { type: 'validation', message: 'Credentials must be a JSON object.' };
          }
          credentials = parsed as {};
        } catch {
          return { type: 'validation', message: 'Credentials must be valid JSON.' };
        }
      }
      return {
        dataSource: {
          type: 'gcs',
          description: desc,
          settings: {
            ...pickStrings(
              {
                project_id: gcs.project_id,
                endpoint: gcs.endpoint,
                token_uri: gcs.token_uri,
                auth: gcs.auth,
              },
              ['project_id', 'endpoint', 'token_uri', 'auth'] as const
            ),
            ...(credentials ? { credentials } : {}),
          },
        },
      };
    }
    case 'azure': {
      const { azure: v } = form;
      return {
        dataSource: {
          type: 'azure',
          description: desc,
          settings: {
            ...pickStrings(v, [
              'endpoint',
              'account',
              'auth',
              'connection_string',
              'key',
              'sas_token',
            ] as const),
          },
        },
      };
    }
    case 'iceberg': {
      const { iceberg: v } = form;
      return {
        dataSource: {
          type: 'iceberg',
          description: desc,
          settings: {
            ...pickStrings(v, ['region', 'endpoint', 'access_key', 'secret_key'] as const),
          },
        },
      };
    }
    case 'jdbc': {
      const { jdbc: j } = form;
      const host = j.host.trim();
      const port = j.port.trim();
      const database = j.database.trim();
      if (!host || !port || !database) {
        return { type: 'validation', message: 'JDBC host, port, and database are required.' };
      }
      return {
        dataSource: {
          type: 'jdbc',
          description: desc,
          settings: {
            type: 'jdbc',
            description: desc,
            id: nameTrim,
            host,
            port,
            database,
            ssl: j.ssl,
            ...pickStrings({ username: j.username, password: j.password }, [
              'username',
              'password',
            ] as const),
          },
        },
      };
    }
    case 'flight': {
      const { flight: f } = form;
      const host = f.host.trim();
      if (!host) {
        return { type: 'validation', message: 'Flight host is required.' };
      }
      const portStr = f.port.trim();
      let port: number | undefined;
      if (portStr) {
        const n = Number(portStr);
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 65535) {
          return {
            type: 'validation',
            message: 'Flight port must be a whole number between 1 and 65535.',
          };
        }
        port = n;
      }
      return {
        dataSource: {
          type: 'flight',
          description: desc,
          settings: { host, ...(port !== undefined ? { port } : {}) },
        },
      };
    }
    default: {
      const exhaustive: never = dataSourceType;
      return { type: 'validation', message: `Unknown type: ${String(exhaustive)}` };
    }
  }
}

function pickStrings<T extends string>(
  rec: Record<T, string>,
  keys: readonly T[]
): Partial<Record<T, string>> {
  const out: Partial<Record<T, string>> = {};
  for (const k of keys) {
    const o = s(rec[k]);
    if (o !== undefined) {
      out[k] = o;
    }
  }
  return out;
}
