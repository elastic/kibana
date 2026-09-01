/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUiamCredential } from '@kbn/core-security-server';

/**
 * Extracts the UIAM key id from a stored alerting `uiamApiKey`.
 *
 * Framework-granted keys are persisted as `base64(<id>:<secret>)` (see
 * `apiKeyAsAlertAttributes`), which is the only shape carrying an id. User-created Cloud
 * keys are stored as the raw `essu_…` secret and have no id — alerting never invalidates
 * them, so returning `undefined` for them is correct rather than a gap.
 *
 * The id is what the invalidation task's in-use guard matches on, so it must be persisted
 * unencrypted next to every copy of the secret.
 */
export const getUiamApiKeyId = (storedUiamApiKey?: string | null): string | undefined => {
  if (!storedUiamApiKey || isUiamCredential(storedUiamApiKey)) {
    return undefined;
  }

  const [id, secret] = Buffer.from(storedUiamApiKey, 'base64').toString().split(':');

  return id && secret && isUiamCredential(secret) ? id : undefined;
};
