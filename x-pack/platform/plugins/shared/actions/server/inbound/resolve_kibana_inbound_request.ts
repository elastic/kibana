/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import { isUiamCredential, markExternalUiamCredential } from '@kbn/core-security-server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { isUnauthorizedError } from '@kbn/es-errors';

import { getUiamApiKeySecret } from './event_identity/encode_api_key';

const MAX_API_KEY_CREDENTIAL_LENGTH = 8192;

const readApiKey = (headers: Record<string, string | string[] | undefined>): string | undefined => {
  const authorization = headers.authorization;
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  const credential =
    typeof header === 'string' ? /^ApiKey\s+(\S+)$/i.exec(header.trim())?.[1] : undefined;
  if (!credential || credential.length > MAX_API_KEY_CREDENTIAL_LENGTH) {
    return undefined;
  }

  // A raw essu_… key is already a UIAM credential. A grant stores base64(id:essu_…);
  // only that raw secret authenticates, so unwrap it before the UIAM attempts.
  if (isUiamCredential(credential)) {
    return credential;
  }
  const [id, secret] = Buffer.from(credential, 'base64').toString('utf8').split(':');
  if (!id || !secret) {
    return undefined;
  }
  return getUiamApiKeySecret(credential);
};

const kibanaApiKeyRequest = (credential: string, spaceId: string): KibanaRequest => {
  const requestHeaders: Headers = { authorization: `ApiKey ${credential}` };
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    spaceId: brandSpaceId(spaceId),
  };
  return kibanaRequestFactory(fakeRawRequest);
};

const elasticsearchAccepts = async (
  elasticsearchClient: IClusterClient,
  request: KibanaRequest
): Promise<boolean> => {
  try {
    await elasticsearchClient.asScoped(request).asCurrentUser.security.authenticate();
    return true;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return false;
    }
    throw error;
  }
};

/**
 * Builds a Kibana request when Elasticsearch accepts the caller's ApiKey and the key can access the space.
 * A 401 or a failed space check returns undefined.
 */
export const resolveKibanaInboundRequest = async ({
  headers,
  spaceId,
  elasticsearchClient,
  getKibanaRequestAccess,
}: {
  headers: Record<string, string | string[] | undefined>;
  spaceId: string;
  elasticsearchClient: IClusterClient;
  getKibanaRequestAccess: (request: KibanaRequest) => Promise<boolean>;
}): Promise<KibanaRequest | undefined> => {
  const credential = readApiKey(headers);
  if (!credential) {
    return undefined;
  }

  // A user-created Cloud key is rejected when Kibana's shared secret is attached, so try that first.
  // A 401 retries once without the mark, because a Kibana-granted UIAM key needs the secret.
  const attempts = isUiamCredential(credential) ? [true, false] : [false];
  for (const external of attempts) {
    const request = kibanaApiKeyRequest(credential, spaceId);
    if (external) {
      markExternalUiamCredential(request);
    }
    if (await elasticsearchAccepts(elasticsearchClient, request)) {
      const allowed = await getKibanaRequestAccess(request);
      return allowed ? request : undefined;
    }
  }
  return undefined;
};
