/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';

export const DescriptionUserActionPayloadSchema = z.object({ description: z.string() });

export const DescriptionUserActionSchema = z.object({
  type: z.literal(UserActionTypes.description),
  payload: DescriptionUserActionPayloadSchema,
});
