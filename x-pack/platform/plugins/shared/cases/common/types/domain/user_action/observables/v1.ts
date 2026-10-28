/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';

const ObservablesActionTypeSchema = lazySchema(() => z.union([
  z.literal('add'),
  z.literal('delete'),
  z.literal('update'),
]));

export const ObservablePayloadSchema = lazySchema(() => z.object({
  count: z.number(),
  actionType: ObservablesActionTypeSchema,
}));

export const ObservablesUserActionPayloadSchema = lazySchema(() => z.object({
  observables: ObservablePayloadSchema,
}));

export const ObservablesUserActionSchema = lazySchema(() => z.object({
  type: z.literal(UserActionTypes.observables),
  payload: ObservablesUserActionPayloadSchema,
}));

export type ObservablesActionType = z.infer<typeof ObservablesActionTypeSchema>;
