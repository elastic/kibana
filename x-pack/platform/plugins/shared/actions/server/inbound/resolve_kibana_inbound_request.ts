/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import {
  HTTPAuthorizationHeader,
  isUiamBearerCredential,
  isUiamCredential,
  markExternalUiamCredential,
} from '@kbn/core-security-server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { isUnauthorizedError } from '@kbn/es-errors';

import { getUiamApiKeySecret } from './event_identity/encode_api_key';

const MAX_API_KEY_CREDENTIAL_LENGTH = 8192;

const readAuthorization = (
  headers: Record<string, string | string[] | undefined>
): string | undefined => {
  const authorization = headers.authorization;
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  return typeof header === 'string' ? header.trim() : undefined;
};

const readUiamBearer = (
  headers: Record<string, string | string[] | undefined>
): string | undefined => {
  const header = readAuthorization(headers);
  const parsed = header ? HTTPAuthorizationHeader.parseFromValue(header) : null;
  if (
    !parsed ||
    !isUiamBearerCredential(parsed) ||
    parsed.credentials.length > MAX_API_KEY_CREDENTIAL_LENGTH
  ) {
    return undefined;
  }
  return parsed.credentials;
};

const readApiKey = (headers: Record<string, string | string[] | undefined>): string | undefined => {
  const header = readAuthorization(headers);
  const credential = header ? /^ApiKey\s+(\S+)$/i.exec(header)?.[1] : undefined;
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

interface InboundAuthorization {
  readonly authorization: string;
  readonly uiam: boolean;
}

/** `Bearer essu_…` wins over `ApiKey`. Anything else is not a Kibana credential. */
const readInboundAuthorization = (
  headers: Record<string, string | string[] | undefined>
): InboundAuthorization | undefined => {
  const bearer = readUiamBearer(headers);
  if (bearer) {
    return { authorization: `Bearer ${bearer}`, uiam: true };
  }
  const apiKey = readApiKey(headers);
  if (!apiKey) {
    return undefined;
  }
  return { authorization: `ApiKey ${apiKey}`, uiam: isUiamCredential(apiKey) };
};

const kibanaAuthRequest = (authorization: string, spaceId: string): KibanaRequest => {
  const requestHeaders: Headers = { authorization };
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
 * Builds a Kibana request when Elasticsearch accepts the caller's credential and it can access the space.
 * `Bearer essu_…` is checked before `ApiKey`. A 401 or a failed space check returns undefined.
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
  const inbound = readInboundAuthorization(headers);
  if (!inbound) {
    return undefined;
  }

  // An `_exchange` bearer authenticates only with Kibana's client authentication.
  // A user-created Cloud API key is rejected when that secret is attached, so those try the
  // external mark first, then once with the secret for a Kibana-granted key.
  const header = HTTPAuthorizationHeader.parseFromValue(inbound.authorization);
  const attempts =
    header && isUiamBearerCredential(header) ? [false] : inbound.uiam ? [true, false] : [false];
  for (const external of attempts) {
    const request = kibanaAuthRequest(inbound.authorization, spaceId);
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
