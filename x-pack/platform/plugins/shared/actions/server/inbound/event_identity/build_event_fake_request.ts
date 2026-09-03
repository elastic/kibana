/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers, KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { markExternalUiamCredential } from '@kbn/core-security-server';
import { brandSpaceId } from '@kbn/core-spaces-common';

import type { RawAction } from '../../types';
import { hasConnectorEventIdentity, identityFromRawAction } from './encode_api_key';
import type { ConnectorEventIdentity } from './types';

export const buildEventScheduleRequest = (
  identity: ConnectorEventIdentity,
  spaceId: string
): KibanaRequest => {
  const credential = identity.apiKey ?? identity.uiamApiKey;
  const requestHeaders: Headers = {};
  if (credential) {
    requestHeaders.authorization = `ApiKey ${credential}`;
  }

  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    spaceId: brandSpaceId(spaceId),
  };

  const fakeRequest = kibanaRequestFactory(fakeRawRequest);

  if (credential && identity.uiamApiKeyExternal === true) {
    markExternalUiamCredential(fakeRequest);
  }

  return fakeRequest;
};

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
