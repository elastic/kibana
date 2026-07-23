/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AI_INDEX_DATA_STREAM_PREFIX, AI_INDEX_INDEX_PREFIX } from '../../../common/constants';
import type { AiIndexDest, AiIndexType } from '../../../common/http_api/ai_indices';

const PREFIX_BY_TYPE: Record<AiIndexType, string> = {
  data_stream: AI_INDEX_DATA_STREAM_PREFIX,
  index: AI_INDEX_INDEX_PREFIX,
};

// Frontend-only restriction agreed for M1: lowercase letters, digits, hyphen, underscore.
const VALID_AI_INDEX_ID = /^[a-z0-9_-]+$/;

// Elasticsearch caps index names at 255 bytes (not characters).
const MAX_INDEX_NAME_BYTES = 255;

export const getAiIndexDest = (type: AiIndexType, id: string): AiIndexDest => ({
  type,
  value: `${PREFIX_BY_TYPE[type]}${id}`,
});

const getByteLength = (value: string): number => new TextEncoder().encode(value).length;

export interface AiIndexIdValidation {
  /** The backing dest, present only when the id is valid. */
  dest?: AiIndexDest;
  /** A translated, user-facing message, present only when the id is invalid. */
  error?: string;
}

export const validateAiIndexId = (type: AiIndexType, id: string): AiIndexIdValidation => {
  if (id === '') {
    return {};
  }

  if (!VALID_AI_INDEX_ID.test(id)) {
    return {
      error: i18n.translate('xpack.contextEngine.aiIndexId.error.invalidChars', {
        defaultMessage:
          'Use only lowercase letters, numbers, hyphens, and underscores (no spaces).',
      }),
    };
  }

  const dest: AiIndexDest = { type, value: `${PREFIX_BY_TYPE[type]}${id}` };
  if (getByteLength(dest.value) > MAX_INDEX_NAME_BYTES) {
    return {
      error: i18n.translate('xpack.contextEngine.aiIndexId.error.tooLong', {
        defaultMessage: 'Name is too long. Try a shorter name.',
      }),
    };
  }

  return { dest };
};
