/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserSchema } from '../user/v1';

export const ExternalServiceBasicSchema = z.object({
  connector_name: z.string(),
  external_id: z.string(),
  external_title: z.string(),
  external_url: z.string(),
  pushed_at: z.string(),
  pushed_by: UserSchema,
});

export const ExternalServiceSchema = ExternalServiceBasicSchema.extend({
  connector_id: z.string(),
});

export type ExternalService = z.infer<typeof ExternalServiceSchema>;
