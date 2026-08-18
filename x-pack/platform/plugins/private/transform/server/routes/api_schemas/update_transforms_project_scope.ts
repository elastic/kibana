/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { CommonResponseStatusSchema } from './common';
import { transformIdsSchema } from './common';

export const updateTransformsProjectScopeRequestSchema = schema.object({
  transformsInfo: transformIdsSchema,
  projectRouting: schema.string({ maxLength: 1000 }),
});

export type UpdateTransformsProjectScopeRequestSchema = TypeOf<
  typeof updateTransformsProjectScopeRequestSchema
>;
export type UpdateTransformsProjectScopeResponseSchema = CommonResponseStatusSchema;
