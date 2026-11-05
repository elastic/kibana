/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { ApiKeysClient } from '@kbn/response-ops-api-keys';

export const ALERTING_V2_PLUGIN_TAG = 'alerting-v2';

export const getActionPolicyApiKeySubject = (name: string): string => `action policy: ${name}`;

/** Action policies run with a UIAM key when UIAM is available, and an ES key otherwise. */
export const createAlertingV2ApiKeysClient = (
  security: SecurityServiceStart,
  logger: Logger
): ApiKeysClient =>
  new ApiKeysClient({
    security,
    logger,
    profile: {
      pluginTag: ALERTING_V2_PLUGIN_TAG,
      uiam: 'only',
      reuse: true,
      metadata: { managed: true, kibana: { type: 'action_policy' } },
    },
  });
