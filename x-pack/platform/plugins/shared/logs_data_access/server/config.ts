/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import {
  MAX_RERANK_INFERENCE_ID_LENGTH,
  RERANK_ENDPOINT,
  RERANK_INFERENCE_ID_PATTERN,
} from './services/semantic_log_search/constants';

const rerankInferenceId = schema.string({
  defaultValue: RERANK_ENDPOINT,
  maxLength: MAX_RERANK_INFERENCE_ID_LENGTH,
  validate: (value) =>
    RERANK_INFERENCE_ID_PATTERN.test(value)
      ? undefined
      : `must contain only letters, digits, dots, underscores and hyphens, got "${value}"`,
});

export const configSchema = schema.object({
  semanticLogSearch: schema.object({
    /**
     * Inference endpoint used to rank log patterns. Defaults to the local, preconfigured one, which
     * needs no setup. Any other `rerank` endpoint works; a hosted one is far faster but sends log
     * message text out of the cluster, and its `relevanceScore` scale is its own.
     */
    rerankInferenceId,
  }),
});

export type LogsDataAccessConfig = TypeOf<typeof configSchema>;
