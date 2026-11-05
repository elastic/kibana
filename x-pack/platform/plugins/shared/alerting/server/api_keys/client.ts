/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SecurityServiceStart } from '@kbn/core/server';
import { ApiKeysClient } from '@kbn/response-ops-api-keys';

export const ALERTING_PLUGIN_TAG = 'alerting';

export interface AlertingApiKeysOptions {
  logger: Logger;
  /** Also grant or reuse UIAM keys. */
  uiamEnabled: boolean;
  /** Fail the rule write instead of logging when a UIAM key can't be granted. */
  uiamRequired: boolean;
}

export const getRuleApiKeySubject = (ruleName: string): string => `alerting rule : ${ruleName}`;

export const createAlertingApiKeysClient = (
  security: SecurityServiceStart,
  { logger, uiamEnabled, uiamRequired }: AlertingApiKeysOptions
): ApiKeysClient =>
  new ApiKeysClient({
    security,
    logger,
    uiamEnabled,
    profile: {
      pluginTag: ALERTING_PLUGIN_TAG,
      uiam: uiamRequired ? 'required' : 'optional',
      reuse: true,
      metadata: { managed: true, kibana: { type: 'alerting_rule' } },
    },
  });
