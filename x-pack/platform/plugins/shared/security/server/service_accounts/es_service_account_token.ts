/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The four bytes Elasticsearch puts at the start of every service account token, before the
 * base64 encoding. See `ServiceAccountToken.PREFIX` in Elasticsearch.
 */
const ES_SERVICE_ACCOUNT_TOKEN_PREFIX = [0, 1, 0, 1] as const;

/**
 * Checks whether a bearer credential is a raw Elasticsearch service account token.
 */
export const isEsServiceAccountToken = (credentials: string): boolean => {
  // Eight base64 characters decode to six bytes, which is enough to read the prefix. Decoding only
  // those keeps the cost the same for every credential, however long it is.
  const prefix = Buffer.from(credentials.slice(0, 8), 'base64');
  return (
    prefix.length >= ES_SERVICE_ACCOUNT_TOKEN_PREFIX.length &&
    ES_SERVICE_ACCOUNT_TOKEN_PREFIX.every((byte, index) => prefix[index] === byte)
  );
};
