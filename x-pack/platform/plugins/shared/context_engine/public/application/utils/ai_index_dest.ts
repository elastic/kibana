/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  AI_INDEX_DATA_STREAM_PREFIX,
  AI_INDEX_INDEX_PREFIX,
  MAX_INDEX_NAME_BYTES,
} from '../../../common/constants';
import type { AiIndexDest, AiIndexType } from '../../../common/http_api/ai_indices';
import { validateAiIndexId as validateAiIndexIdFormat } from '../../../common/validation';

const PREFIX_BY_TYPE: Record<AiIndexType, string> = {
  data_stream: AI_INDEX_DATA_STREAM_PREFIX,
  index: AI_INDEX_INDEX_PREFIX,
};

export const getAiIndexDest = (type: AiIndexType, id: string): AiIndexDest => ({
  type,
  value: `${PREFIX_BY_TYPE[type]}${id}`,
});

const getByteLength = (value: string): number => new TextEncoder().encode(value).length;

export interface AiIndexIdValidation {
  /** The backing dest, present only when the id is valid. */
  dest?: AiIndexDest;
  /** A user-facing message, present only when the id is invalid. */
  error?: string;
}

export const validateAiIndexId = (type: AiIndexType, id: string): AiIndexIdValidation => {
  if (id === '') {
    return {};
  }

  const formatError = validateAiIndexIdFormat(id);
  if (formatError !== undefined) {
    return { error: formatError };
  }

  const dest = getAiIndexDest(type, id);
  if (getByteLength(dest.value) > MAX_INDEX_NAME_BYTES) {
    return {
      error: i18n.translate('xpack.contextEngine.aiIndexId.error.tooLong', {
        defaultMessage: 'Name is too long. Try a shorter name.',
      }),
    };
  }

  return { dest };
};
