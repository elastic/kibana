/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { toFakeRequest } from '@kbn/response-ops-api-keys';

import type { RawAction } from '../../types';
import { hasConnectorEventIdentity, identityFromRawAction } from './identity_attributes';
import type { ConnectorEventIdentity } from './types';

export const buildEventScheduleRequest = (
  identity: ConnectorEventIdentity,
  spaceId: string
): KibanaRequest => toFakeRequest(identity, { spaceId, prefer: 'uiam' }).request;

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
