/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorAuthStatusResponseV1 } from '../../../../../../common/routes/connector/response';
import type { GetAuthStatusResult } from '../../../../../application/connector/methods/get_auth_status/types';

export const transformAuthStatusResponseV1 = (
  result: GetAuthStatusResult
): ConnectorAuthStatusResponseV1 => {
  const body: ConnectorAuthStatusResponseV1 = {};
  for (const [id, { userAuthStatus }] of Object.entries(result)) {
    body[id] = { user_auth_status: userAuthStatus };
  }
  return body;
};
