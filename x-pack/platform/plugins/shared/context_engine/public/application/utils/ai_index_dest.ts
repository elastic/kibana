/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AI_INDEX_DATA_STREAM_PREFIX, AI_INDEX_INDEX_PREFIX } from '../../../common/constants';
import type { AiIndexDest, AiIndexType } from '../../../common/http_api/ai_indices';

const PREFIX_BY_TYPE: Record<AiIndexType, string> = {
  data_stream: AI_INDEX_DATA_STREAM_PREFIX,
  index: AI_INDEX_INDEX_PREFIX,
};

/** Turns a display name into a value safe to use in an index/data stream name. */
export const slugifyAiIndexName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getAiIndexDest = (type: AiIndexType, name: string): AiIndexDest => ({
  type,
  value: `${PREFIX_BY_TYPE[type]}${slugifyAiIndexName(name)}`,
});
