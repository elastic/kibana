/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { buildApiKeyFakeRequest } from '@kbn/response-ops-scoped-api-keys';

import type { RawAction } from '../../types';
import {
  authorizationCredentialFromIdentity,
  hasConnectorEventIdentity,
  identityFromRawAction,
} from './encode_api_key';
import type { ConnectorEventIdentity } from './types';

export const buildEventScheduleRequest = (
  identity: ConnectorEventIdentity,
  spaceId: string
): KibanaRequest =>
  buildApiKeyFakeRequest({
    apiKey: authorizationCredentialFromIdentity(identity),
    spaceId,
    uiamApiKeyExternal: identity.uiamApiKey ? identity.uiamApiKeyExternal : undefined,
  });

export const resolveConnectorEventScheduleRequest = (
  attributes: RawAction,
  spaceId: string
): KibanaRequest | undefined => {
  const identity = identityFromRawAction(attributes);
  if (!hasConnectorEventIdentity(identity)) {
    return undefined;
  }
  return buildEventScheduleRequest(identity, spaceId);
};
