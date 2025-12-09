/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  STREAM_NAME,
  LLM_SUGGESTION_NAME,
  LLM_SUGGESTION_TYPE,
  LLM_SUGGESTION_UUID,
  LLM_SUGGESTION_DESCRIPTION,
} from './fields';

export interface StoredLLMSuggestion {
  [LLM_SUGGESTION_TYPE]: string;
  [LLM_SUGGESTION_UUID]: string;
  [LLM_SUGGESTION_NAME]: string;
  [LLM_SUGGESTION_DESCRIPTION]: string;
  [STREAM_NAME]: string;
}

export const storedLLMSuggestionSchema: z.Schema<StoredLLMSuggestion> = z.object({
  [LLM_SUGGESTION_TYPE]: z.string(),
  [LLM_SUGGESTION_UUID]: z.string(),
  [LLM_SUGGESTION_NAME]: z.string(),
  [LLM_SUGGESTION_DESCRIPTION]: z.string(),
  [STREAM_NAME]: z.string(),
});
