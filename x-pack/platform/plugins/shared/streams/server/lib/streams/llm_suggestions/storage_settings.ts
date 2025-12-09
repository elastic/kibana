/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import {
  STREAM_NAME,
  LLM_SUGGESTION_NAME,
  LLM_SUGGESTION_TYPE,
  LLM_SUGGESTION_UUID,
  LLM_SUGGESTION_DESCRIPTION,
} from './fields';

export const llmSuggestionsStorageSettings = {
  name: '.kibana_streams_llm_suggestions',
  schema: {
    properties: {
      [LLM_SUGGESTION_NAME]: types.keyword(),
      [STREAM_NAME]: types.keyword(),
      [LLM_SUGGESTION_TYPE]: types.keyword(),
      [LLM_SUGGESTION_UUID]: types.keyword(),
      [LLM_SUGGESTION_DESCRIPTION]: types.text(),
    },
  },
} satisfies IndexStorageSettings;

export type LLMSuggestionStorageSettings = typeof llmSuggestionsStorageSettings;
