/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { streamObjectNameSchema } from './shared/stream_object_name';

export const llmSuggestionSchema = z.object({
  type: z.string(),
  name: streamObjectNameSchema,
  description: z.string(),
});

export type LLMSuggestion = z.infer<typeof llmSuggestionSchema>;
