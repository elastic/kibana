/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { CaseUserActionConnectorSchema, CaseConnectorSchema } from '../../connector/v1';
import { UserActionTypes } from '../action/v1';

export const ConnectorUserActionPayloadWithoutConnectorIdSchema = lazySchema(() => z.object({
  connector: CaseUserActionConnectorSchema,
}));

export const ConnectorUserActionPayloadSchema = lazySchema(() => z.object({
  connector: CaseConnectorSchema,
}));

export const ConnectorUserActionWithoutConnectorIdSchema = lazySchema(() => z.object({
  type: z.literal(UserActionTypes.connector),
  payload: ConnectorUserActionPayloadWithoutConnectorIdSchema,
}));

export const ConnectorUserActionSchema = lazySchema(() => z.object({
  type: z.literal(UserActionTypes.connector),
  payload: ConnectorUserActionPayloadSchema,
}));
