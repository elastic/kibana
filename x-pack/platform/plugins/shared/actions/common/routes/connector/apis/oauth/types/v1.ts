/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  startOAuthFlowPathParamsSchema,
  startOAuthFlowRequestBodySchema,
  disconnectOAuthPathParamsSchema,
} from '../schemas/v1';

export type StartOAuthFlowRequestBody = TypeOf<typeof startOAuthFlowRequestBodySchema>;
export type StartOAuthFlowPathParams = TypeOf<typeof startOAuthFlowPathParamsSchema>;

export interface StartOAuthFlowResponse {
  authorizationUrl: string;
}

export type DisconnectOAuthPathParams = TypeOf<typeof disconnectOAuthPathParamsSchema>;
