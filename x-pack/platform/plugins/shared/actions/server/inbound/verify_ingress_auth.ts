/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timingSafeEqual } from 'node:crypto';

import { computeIngestTokenHash } from './compute_ingest_token_hash';
import { INBOUND_EVENTS_TOKEN_MAX_LENGTH } from './constants';

const extractBearerToken = (
  headers: Record<string, string | string[] | undefined>
): string | undefined => {
  const authorization = headers.authorization;
  const headerValue = Array.isArray(authorization) ? authorization[0] : authorization;
  if (typeof headerValue !== 'string') {
    return undefined;
  }
  const bearerMatch = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  const bearerToken = bearerMatch?.[1];
  if (!bearerToken || bearerToken.length === 0) {
    return undefined;
  }
  return bearerToken.length <= INBOUND_EVENTS_TOKEN_MAX_LENGTH ? bearerToken : undefined;
};

const extractQueryToken = (query: Record<string, unknown>): string | undefined => {
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
  query: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
}): string | undefined => {
  // Prefer Authorization: Bearer (keeps secrets out of URLs/logs); fall back to ?token=.
  return extractBearerToken(headers) ?? extractQueryToken(query);
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
  if (expectedHash.length !== ingestTokenHash.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expectedHash), Buffer.from(ingestTokenHash));
};
