/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SecurityServiceStart } from '@kbn/core/server';
import { ApiKeysClient } from '@kbn/response-ops-api-keys';

export const TASK_MANAGER_PLUGIN_TAG = 'task-manager';

export interface TaskManagerApiKeysOptions {
  logger: Logger;
  /** Also grant or reuse UIAM keys. */
  uiamEnabled: boolean;
  /** Fail instead of logging when a UIAM key can't be granted. */
  uiamRequired: boolean;
}

export const createTaskManagerApiKeysClient = (
  security: SecurityServiceStart,
  { logger, uiamEnabled, uiamRequired }: TaskManagerApiKeysOptions
): ApiKeysClient =>
  new ApiKeysClient({
    security,
    logger,
    uiamEnabled,
    profile: {
      pluginTag: TASK_MANAGER_PLUGIN_TAG,
      uiam: uiamRequired ? 'required' : 'optional',
      reuse: true,
      metadata: { managed: true },
      // Some deployments can't mint UIAM keys, so tasks scheduled without UIAM credentials are
      // expected and fall back to ES keys.
      missingUiamCredentialsLogLevel: 'debug',
    },
  });
