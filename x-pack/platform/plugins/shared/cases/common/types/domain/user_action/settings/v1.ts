/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { UserActionTypes } from '../action/v1';

export const SettingsUserActionPayloadSchema = lazySchema(() =>
  z.object({
    settings: z.object({
      syncAlerts: z.boolean().optional(),
      extractObservables: z.boolean().optional(),
    }),
  })
);

export const SettingsUserActionSchema = lazySchema(() =>
  z.object({
    type: z.literal(UserActionTypes.settings),
    payload: SettingsUserActionPayloadSchema,
  })
);
