/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HTTPAuthorizationHeader } from '../authentication/http_authentication';

const UIAM_CREDENTIALS_PREFIX = 'essu_';

/**
 * Checks if the given authorization credentials are UIAM credentials.
 *
 * @param credential The HTTP authorization header or access token to check.
 * @returns True if the credentials start with UIAM_CREDENTIALS_PREFIX, false otherwise.
 */
export function isUiamCredential(credential: HTTPAuthorizationHeader | string) {
  return (
    credential instanceof HTTPAuthorizationHeader ? credential.credentials : credential
  ).startsWith(UIAM_CREDENTIALS_PREFIX);
}

/**
 * Checks if the given API key is a UIAM API key.
 * @param apiKey
 * @returns True if the API Key starts with UIAM_CREDENTIALS_PREFIX, false otherwise.
 */
export function isUiamApiKey(apiKey: string) {
  return apiKey.startsWith(UIAM_CREDENTIALS_PREFIX);
}
