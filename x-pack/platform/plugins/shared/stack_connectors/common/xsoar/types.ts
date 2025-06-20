/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  ConfigSchema,
  SecretsSchema,
  XSOARRunActionParamsSchema,
  XSOARRunActionResponseSchema,
  XSOARPlaybooksObjectSchema,
  XSOARPlaybooksActionResponseSchema,
  ExecutorParamsSchema,
} from './schema';

export type Config = TypeOf<typeof ConfigSchema>;
export type Secrets = TypeOf<typeof SecretsSchema>;
export type XSOARRunActionParams = TypeOf<typeof XSOARRunActionParamsSchema>;
export type XSOARRunActionResponse = TypeOf<typeof XSOARRunActionResponseSchema>;
export type XSOARPlaybooksActionParams = void;
export type XSOARPlaybooksObject = TypeOf<typeof XSOARPlaybooksObjectSchema>;
export type XSOARPlaybooksActionResponse = TypeOf<typeof XSOARPlaybooksActionResponseSchema>;
export type ExecutorParams = TypeOf<typeof ExecutorParamsSchema>;
