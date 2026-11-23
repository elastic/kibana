/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * UIAM authentication error codes that Elasticsearch embeds in the 401 reason when a cloud
 * API key can no longer authenticate. All three mean the stored key is permanently unusable
 * and the rule needs a new one. Core keeps its copies of these codes private
 * (`@kbn/core-security-server`, `src/uiam/errors.ts`), so they are mirrored here.
 */
const UIAM_TERMINAL_API_KEY_ERROR_CODES = [
  '0x28D520', // APIKEY_MISSING
  '0xD38358', // APIKEY_REVOKED
  '0xE436AE', // APIKEY_EXPIRED
] as const;

/**
 * The full phrase is required, not the bare code, so a rule whose own error text quotes a
 * code (a real possibility for detection rules that search for authentication failures)
 * cannot trigger the guidance.
 */
const CLOUD_API_KEY_AUTH_ERROR_PHRASES = UIAM_TERMINAL_API_KEY_ERROR_CODES.map(
  (code) => `failed to authenticate cloud API key: [${code}]`
);

export const CLOUD_API_KEY_AUTH_ERROR_GUIDANCE = i18n.translate(
  'xpack.alerting.taskRunner.error.cloudApiKeyAuthErrorGuidance',
  {
    defaultMessage:
      'The API key of this rule is no longer valid; it may have been revoked, deleted, or expired. Update the API key of the rule to restore executions.',
  }
);

export const addCloudApiKeyAuthErrorGuidance = (message: string): string =>
  CLOUD_API_KEY_AUTH_ERROR_PHRASES.some((phrase) => message.includes(phrase))
    ? `${CLOUD_API_KEY_AUTH_ERROR_GUIDANCE} ${message}`
    : message;
