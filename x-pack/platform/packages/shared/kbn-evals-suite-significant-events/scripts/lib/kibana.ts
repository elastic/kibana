/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from './get_connection_config';

export { readKibanaConfig, resolveKibanaUrl } from '@kbn/otel-demo';

const TEMP_USER = 'restore_sigevents_env_snapshot_tmp';
const TEMP_PASSWORD = 'restore_sigevents_env_snapshot_tmp_pass!';
export function generateAuthHeader(config: ConnectionConfig): string {
  return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
}

export async function kibanaRequest(
  config: ConnectionConfig,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const response = await fetch(`${config.kibanaUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: generateAuthHeader(config),
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'create-sigevents-snapshots',
      'elastic-api-version': '2023-10-31',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => null);

  return { status: response.status, data };
}

export async function withTempSuperuser<T>(
  esClient: Client,
  log: ToolingLog,
  config: ConnectionConfig,
  fn: (sysClient: Client) => Promise<T>
): Promise<T> {
  // Pre-flight: remove any stale user left by a previous crashed run.
  try {
    await esClient.security.deleteUser({ username: TEMP_USER });
    log.debug(`withTempSuperuser: removed stale temp user "${TEMP_USER}" from previous run`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (err.meta?.statusCode === 404) {
      log.debug(`withTempSuperuser: pre-flight deleteUser failed: ${msg}`);
    }
  }

  try {
    await esClient.security.putUser({
      username: TEMP_USER,
      password: TEMP_PASSWORD,
      roles: ['system_indices_superuser'],
    });
    log.info(
      `withTempSuperuser: created temp user "${TEMP_USER}" with system_indices_superuser role`
    );
    const sysClient = new Client({
      node: config.esUrl,
      auth: { username: TEMP_USER, password: TEMP_PASSWORD },
    });
    return await fn(sysClient);
  } finally {
    try {
      await esClient.security.deleteUser({ username: TEMP_USER });
      log.info(`withTempSuperuser: deleted temp user "${TEMP_USER}"`);
    } catch (err) {
      log.warning(
        `withTempSuperuser: failed to delete temp user "${TEMP_USER}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }
}
