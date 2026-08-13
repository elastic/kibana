/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUiamCredential } from '@kbn/core-security-server';

/**
 * Extracts the raw UIAM secret (`essu_...`) from a stored rule `uiamApiKey` value.
 *
 * Framework-granted UIAM keys are stored as `base64(id:key)`; user-created Cloud API
 * keys carry no key id and are stored as the raw credential itself.
 */
export const getUiamApiKeySecret = (storedUiamApiKey: string): string => {
  if (isUiamCredential(storedUiamApiKey)) {
    return storedUiamApiKey;
  }

  const [, secret] = Buffer.from(storedUiamApiKey, 'base64').toString().split(':');
  return secret;
};
