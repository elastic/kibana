/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, errors } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from './get_connection_config';

const TEMP_USER = 'restore_sigevents_env_snapshot_tmp';
const TEMP_PASSWORD = 'restore_sigevents_env_snapshot_tmp_pass!';

async function deleteUser(esClient: Client, log: ToolingLog, username: string): Promise<void> {
  try {
    await esClient.security.deleteUser({ username });
    log.info(`withTempSuperuser: deleted temp user "${TEMP_USER}"`);
  } catch (err) {
    const statusCode = err instanceof errors.ResponseError ? err.statusCode : undefined;
    const msg = err instanceof Error ? err.message : String(err);

    if (statusCode === 404) {
      // Expected: no stale user from a prior run.
      log.debug(`withTempSuperuser: no stale temp user to clean up`);
    } else {
      // 403 (missing manage_security), 5xx, network errors, etc.
      throw new Error(
        `withTempSuperuser: pre-flight deleteUser failed (status=${
          statusCode ?? 'unknown'
        }): ${msg}`
      );
    }
  }
}

export async function withTempSuperuser<T>(
  esClient: Client,
  log: ToolingLog,
  config: ConnectionConfig,
  fn: (sysClient: Client) => Promise<T>
): Promise<T> {
  // Pre-flight: remove any stale user left by a previous crashed run.
  await deleteUser(esClient, log, TEMP_USER);
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
    await deleteUser(esClient, log, TEMP_USER);
  }
}
