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

// Characters Elasticsearch forbids anywhere in an index name. Because the value
// is always prefixed, the "cannot start with -, _, +, ." and cannot be "."/".."
// rules are already satisfied, so replacing these is enough to keep it valid.
const ILLEGAL_INDEX_NAME_CHARS = /[\\/*?"<>|\s,#:]+/g;

// Elasticsearch caps index names at 255 bytes (not characters).
const MAX_INDEX_NAME_BYTES = 255;

/**
 * Derives an Elasticsearch-safe name from a display name: lowercases it and
 * replaces every run of forbidden characters with a single hyphen, preserving
 * all other characters (including non-ASCII). Leading/trailing hyphens are
 * trimmed so the prefixed value stays valid.
 */
export const sanitizeAiIndexName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(ILLEGAL_INDEX_NAME_CHARS, '-')
    .replace(/^-+|-+$/g, '');

export const getAiIndexDest = (type: AiIndexType, name: string): AiIndexDest => ({
  type,
  value: `${PREFIX_BY_TYPE[type]}${sanitizeAiIndexName(name)}`,
});

const getByteLength = (value: string): number => new TextEncoder().encode(value).length;

export interface AiIndexNameValidation {
  /** The backing dest, present only when the name is valid. */
  dest?: AiIndexDest;
  /** A translated, user-facing message, present only when the name is invalid. */
  error?: string;
}

/**
 * Builds the backing dest for a display name and validates it against the
 * Elasticsearch index-naming rules that survive prefixing. An empty name is
 * treated as incomplete — neither valid nor an error — so a form can disable
 * submission without showing a message for an untouched field.
 */
export const validateAiIndexName = (type: AiIndexType, name: string): AiIndexNameValidation => {
  if (name.trim() === '') {
    return {};
  }

  const slug = sanitizeAiIndexName(name);
  if (slug === '') {
    return {
      error: i18n.translate('xpack.contextEngine.aiIndexName.error.empty', {
        defaultMessage: 'Name must include at least one letter or number.',
      }),
    };
  }

  const dest: AiIndexDest = { type, value: `${PREFIX_BY_TYPE[type]}${slug}` };
  if (getByteLength(dest.value) > MAX_INDEX_NAME_BYTES) {
    return {
      error: i18n.translate('xpack.contextEngine.aiIndexName.error.tooLong', {
        defaultMessage: 'Name is too long. Try a shorter name.',
      }),
    };
  }

  return { dest };
};
