/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Starts with a lowercase letter or number, then lowercase letters, numbers, hyphens, or underscores.
export const AI_INDEX_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

/** Returns a translated error message for an invalid AI index id, or `undefined` when valid. */
export const validateAiIndexId = (value: string): string | undefined =>
  AI_INDEX_ID_PATTERN.test(value)
    ? undefined
    : i18n.translate('xpack.contextEngine.aiIndexId.error.invalidFormat', {
        defaultMessage:
          'Must start with a lowercase letter or number, then use lowercase letters, numbers, hyphens, and underscores.',
      });
