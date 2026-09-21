/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timingSafeEqual } from 'node:crypto';

import { computeIngestTokenHash } from './compute_ingest_token_hash';
import { INBOUND_EVENTS_TOKEN_MAX_LENGTH } from '../../common/routes/events/apis/ingest';

const getAuthorizationHeaderValue = (
  headers: Record<string, string | string[] | undefined>
): string | undefined => {
  const authorization = headers.authorization;
  const headerValue = Array.isArray(authorization) ? authorization[0] : authorization;
  return typeof headerValue === 'string' ? headerValue : undefined;
};

/**
 * Returns the Bearer token when present and valid, or `undefined` when the
 * Authorization header is missing / not Bearer / empty / oversize.
 */
const extractBearerToken = (authorizationHeader: string): string | undefined => {
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
  const bearerToken = bearerMatch?.[1];
  if (!bearerToken || bearerToken.length === 0) {
    return undefined;
  }
  if (bearerToken.length > INBOUND_EVENTS_TOKEN_MAX_LENGTH) {
    return undefined;
  }
  return bearerToken;
};

const extractQueryToken = (query: { token?: string | string[] }): string | undefined => {
  const queryToken = query.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) {
    return queryToken.length <= INBOUND_EVENTS_TOKEN_MAX_LENGTH ? queryToken : undefined;
  }
  if (Array.isArray(queryToken) && typeof queryToken[0] === 'string' && queryToken[0].length > 0) {
    return queryToken[0].length <= INBOUND_EVENTS_TOKEN_MAX_LENGTH ? queryToken[0] : undefined;
  }
  return undefined;
};

export const extractIngestToken = ({
  query,
  headers,
}: {
  query: { token?: string | string[] };
  headers: Record<string, string | string[] | undefined>;
}): string | undefined => {
  // Prefer Authorization: Bearer (keeps secrets out of URLs/logs).
  // If Authorization is present but invalid, do not fall back to ?token=.
  const authorizationHeader = getAuthorizationHeaderValue(headers);
  if (authorizationHeader !== undefined) {
    return extractBearerToken(authorizationHeader);
  }
  return extractQueryToken(query);
};

export const verifyIngestToken = ({
  connectorId,
  spaceId,
  providedToken,
  ingestTokenHash,
}: {
  connectorId: string;
  spaceId: string;
  providedToken: string;
  ingestTokenHash: string;
}): boolean => {
  const expectedHash = computeIngestTokenHash({
    connectorId,
    spaceId,
    token: providedToken,
  });
  const expected = Buffer.from(expectedHash, 'hex');
  const stored = Buffer.from(ingestTokenHash, 'hex');
  if (expected.length === 0 || expected.length !== stored.length) {
    return false;
  }
  return timingSafeEqual(expected, stored);
};
