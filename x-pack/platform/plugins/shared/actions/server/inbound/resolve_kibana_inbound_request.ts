/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import { CLOUD_SERVICE_ACCOUNT_REALM_TYPE } from '@kbn/core-security-common';
import {
  ES_CLIENT_AUTHENTICATION_HEADER,
  HTTPAuthorizationHeader,
  isUiamBearerCredential,
  isUiamCredential,
  markExternalUiamCredential,
} from '@kbn/core-security-server';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { isUnauthorizedError } from '@kbn/es-errors';

import { getUiamApiKeySecret } from './event_identity/encode_api_key';

const MAX_API_KEY_CREDENTIAL_LENGTH = 8192;

type InboundAuthorization =
  | { readonly kind: 'bearer'; readonly authorization: HTTPAuthorizationHeader }
  | { readonly kind: 'api_key'; readonly credential: string };

const readHeaderValue = (
  headers: Record<string, string | string[] | undefined>
): string | undefined => {
  const authorization = headers.authorization;
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  return typeof header === 'string' ? header : undefined;
};

/** One token after the scheme. A credential with internal whitespace is not an ApiKey. */
const readApiKeyCredential = (credentials: string): string | undefined => {
  const credential = credentials.trim();
  if (
    credential.length === 0 ||
    credential.length > MAX_API_KEY_CREDENTIAL_LENGTH ||
    /\s/.test(credential)
  ) {
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

/**
 * Parses Authorization once. `kind` is the scheme already decided here, so callers do not
 * parse the header again.
 */
const readInboundAuthorization = (
  headers: Record<string, string | string[] | undefined>
): InboundAuthorization | undefined => {
  const header = readHeaderValue(headers)?.trim();
  const authorization = header ? HTTPAuthorizationHeader.parseFromValue(header) : null;
  if (!authorization) {
    return undefined;
  }
  if (isUiamBearerCredential(authorization)) {
    return { kind: 'bearer', authorization };
  }
  if (authorization.scheme.toLowerCase() !== 'apikey') {
    return undefined;
  }
  const credential = readApiKeyCredential(authorization.credentials);
  return credential ? { kind: 'api_key', credential } : undefined;
};

const kibanaApiKeyRequest = (credential: string, spaceId: string): KibanaRequest => {
  const requestHeaders: Headers = { authorization: `ApiKey ${credential}` };
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    spaceId: brandSpaceId(spaceId),
  };
  return kibanaRequestFactory(fakeRawRequest);
};

const readClientAuthentication = (
  headers: Record<string, string | string[] | undefined>
): string | undefined => {
  const value = headers[ES_CLIENT_AUTHENTICATION_HEADER];
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_API_KEY_CREDENTIAL_LENGTH
  ) {
    return undefined;
  }
  return value;
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

const kibanaBearerRequest = (
  authorization: string,
  clientAuthentication: string | undefined,
  spaceId: string
): KibanaRequest => {
  const requestHeaders: Headers = {
    authorization,
    ...(clientAuthentication ? { [ES_CLIENT_AUTHENTICATION_HEADER]: clientAuthentication } : {}),
  };
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    spaceId: brandSpaceId(spaceId),
  };
  return kibanaRequestFactory(fakeRawRequest);
};

/**
 * Internal-only path for Relay. It is deliberately absent from the public OAS: the route
 * description and docs only advertise the ingest token.
 *
 * Requirements, any of which failing returns undefined (the route answers 404):
 * - `Authorization: Bearer essu_…` for a Cloud service-account.
 * - `x-client-authentication` present on a real (non-fake) request. It is internal client
 *   authentication and is not a customer-facing option.
 * - Elasticsearch authenticates the bearer in the cloud service-account realm.
 * - The credential can access the space and the connector is an events-enabled in-memory connector.
 */
const resolveServiceAccountBearer = async ({
  authorization,
  inboundRequest,
  spaceId,
  elasticsearchClient,
  getKibanaRequestAccess,
}: {
  authorization: HTTPAuthorizationHeader;
  inboundRequest: KibanaRequest;
  spaceId: string;
  elasticsearchClient: IClusterClient;
  getKibanaRequestAccess: (request: KibanaRequest) => Promise<boolean>;
}): Promise<KibanaRequest | undefined> => {
  if (
    authorization.credentials.length === 0 ||
    authorization.credentials.length > MAX_API_KEY_CREDENTIAL_LENGTH
  ) {
    return undefined;
  }

  // Cluster client relays x-client-authentication only for a real request. A factory
  // request is internal, and Kibana would attach its own secret.
  const clientAuthentication = readClientAuthentication(inboundRequest.headers);
  if (!clientAuthentication || inboundRequest.isFakeRequest) {
    return undefined;
  }

  let authenticationRealmType: string | undefined;
  try {
    const user = await elasticsearchClient
      .asScoped(inboundRequest)
      .asCurrentUser.security.authenticate();
    authenticationRealmType = user.authentication_realm?.type;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return undefined;
    }
    throw error;
  }

  // A user essu_ bearer must not fall through to the API-key grant.
  if (authenticationRealmType !== CLOUD_SERVICE_ACCOUNT_REALM_TYPE) {
    return undefined;
  }

  const allowed = await getKibanaRequestAccess(inboundRequest);
  if (!allowed) {
    return undefined;
  }

  // The schedule request carries the same pair the grant reads. It is not used to
  // decide admission: asScoped on this object would classify the call as internal.
  return kibanaBearerRequest(authorization.toString(), clientAuthentication, spaceId);
};

/**
 * Builds a Kibana request when Elasticsearch accepts the caller's ApiKey or UIAM service-account
 * bearer and that credential can access the space. A 401 or a failed space check returns undefined.
 */
export const resolveKibanaInboundRequest = async ({
  inboundRequest,
  spaceId,
  elasticsearchClient,
  getKibanaRequestAccess,
}: {
  inboundRequest: KibanaRequest;
  spaceId: string;
  elasticsearchClient: IClusterClient;
  getKibanaRequestAccess: (request: KibanaRequest) => Promise<boolean>;
}): Promise<KibanaRequest | undefined> => {
  const inbound = readInboundAuthorization(inboundRequest.headers);
  if (!inbound) {
    return undefined;
  }

  if (inbound.kind === 'bearer') {
    return resolveServiceAccountBearer({
      authorization: inbound.authorization,
      inboundRequest,
      spaceId,
      elasticsearchClient,
      getKibanaRequestAccess,
    });
  }

  // A user-created Cloud key is rejected when Kibana's shared secret is attached, so try that first.
  // A 401 retries once without the mark, because a Kibana-granted UIAM key needs the secret.
  const attempts = isUiamCredential(inbound.credential) ? [true, false] : [false];
  for (const external of attempts) {
    const request = kibanaApiKeyRequest(inbound.credential, spaceId);
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
