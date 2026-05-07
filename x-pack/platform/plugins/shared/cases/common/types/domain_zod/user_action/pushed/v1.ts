/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ExternalServiceBasicSchema, ExternalServiceSchema } from '../../external_service/v1';
import { UserActionTypes } from '../action/v1';

export const PushedUserActionPayloadWithoutConnectorIdSchema = z.object({
  externalService: ExternalServiceBasicSchema,
});

export const PushedUserActionPayloadSchema = z.object({
  externalService: ExternalServiceSchema,
});

export const PushedUserActionWithoutConnectorIdSchema = z.object({
  type: z.literal(UserActionTypes.pushed),
  payload: PushedUserActionPayloadWithoutConnectorIdSchema,
});

export const PushedUserActionSchema = z.object({
  type: z.literal(UserActionTypes.pushed),
  payload: PushedUserActionPayloadSchema,
});
