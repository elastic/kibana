/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  D3SecurityConfigSchema,
  D3SecuritySecretsSchema,
  D3SecurityRunActionParamsSchema,
  D3SecurityRunActionResponseSchema,
} from './schema';

export type D3SecurityConfig = TypeOf<typeof D3SecurityConfigSchema>;
export type D3SecuritySecrets = TypeOf<typeof D3SecuritySecretsSchema>;
export type D3SecurityRunActionParams = TypeOf<typeof D3SecurityRunActionParamsSchema>;
export type D3SecurityRunActionResponse = TypeOf<typeof D3SecurityRunActionResponseSchema>;
