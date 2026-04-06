/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const startOAuthFlowRequestBodySchema = schema.object({
  returnUrl: schema.maybe(schema.uri({ scheme: ['http', 'https'] })),
});

export const startOAuthFlowPathParamsSchema = schema.object({
  connectorId: schema.string(),
});

export const disconnectOAuthPathParamsSchema = schema.object({
  connectorId: schema.string(),
});
