/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SecurityServiceStart } from '@kbn/core/server';
import type { ApiKeyType } from '../config';
import type { ApiKeyStrategy } from './api_key_strategy';
import { EsApiKeyStrategy } from './es_api_key_strategy';
import { EsAndUiamApiKeyStrategy } from './es_and_uiam_api_key_strategy';

export const createApiKeyStrategy = (
  apiKeyType: ApiKeyType,
  grantUiamApiKeys: boolean,
  security: SecurityServiceStart,
  logger: Logger
): ApiKeyStrategy => {
  if (grantUiamApiKeys && security.authc.apiKeys.uiam) {
    return new EsAndUiamApiKeyStrategy(apiKeyType, security, logger);
  }
  return new EsApiKeyStrategy();
};
