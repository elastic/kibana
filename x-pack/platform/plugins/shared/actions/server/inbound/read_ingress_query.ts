/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_HANDSHAKE_CHALLENGE_LENGTH } from '@kbn/connector-specs';

const INGEST_TOKEN_QUERY_KEY = 'token';
const MAX_INGRESS_QUERY_KEYS = 16;
const MAX_INGRESS_QUERY_KEY_LENGTH = 128;

/**
 * Query parameters for the spoke, after the ingest token is verified.
 * Drops `token`, empty entries, non-strings, and over-cap keys or values.
 */
export const readIngressQuery = (query: object): Readonly<Record<string, string>> => {
  const spokeQuery: Record<string, string> = {};
  for (const [key, value] of Object.entries(query) as Array<[string, unknown]>) {
    if (Object.keys(spokeQuery).length >= MAX_INGRESS_QUERY_KEYS) {
      break;
    }
    if (
      key === INGEST_TOKEN_QUERY_KEY ||
      key.length === 0 ||
      key.length > MAX_INGRESS_QUERY_KEY_LENGTH ||
      typeof value !== 'string' ||
      value.length === 0 ||
      value.length > MAX_HANDSHAKE_CHALLENGE_LENGTH
    ) {
      continue;
    }
    spokeQuery[key] = value;
  }
  return spokeQuery;
};
