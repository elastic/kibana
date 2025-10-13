/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type {
  ConfigSchema,
  SecretsSchema,
  XSOARRunActionParamsSchema,
  XSOARRunActionResponseSchema,
  XSOARPlaybooksObjectSchema,
  XSOARPlaybooksActionResponseSchema,
  ExecutorParamsSchema,
} from './schema';

export type Config = z.infer<typeof ConfigSchema>;
export type Secrets = z.input<typeof SecretsSchema>;
export type XSOARRunActionParams = z.infer<typeof XSOARRunActionParamsSchema>;
export type XSOARRunActionResponse = z.infer<typeof XSOARRunActionResponseSchema>;
export type XSOARPlaybooksActionParams = void;
export type XSOARPlaybooksObject = z.infer<typeof XSOARPlaybooksObjectSchema>;
export type XSOARPlaybooksActionResponse = z.infer<typeof XSOARPlaybooksActionResponseSchema>;
export type ExecutorParams = z.infer<typeof ExecutorParamsSchema>;
