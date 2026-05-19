/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SecurityServiceStart } from '@kbn/core/server';
import type { ApiKeyType } from '../config';
import type { ApiKeyStrategy } from './api_key_strategy';
export declare const createApiKeyStrategy: (
  apiKeyType: ApiKeyType,
  grantUiamApiKeys: boolean,
  security: SecurityServiceStart,
  logger: Logger
) => ApiKeyStrategy;
