/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import {
  CUSTOM_CONTENT_MAX_PROMPT_LENGTH,
  CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
} from '../../common/constants';

export const customContentStateSchema = z.object({
  prompt: z.string().max(CUSTOM_CONTENT_MAX_PROMPT_LENGTH).optional(),
  esqlQuery: z.string().max(CUSTOM_CONTENT_MAX_ESQL_QUERY_LENGTH).optional(),
  template: z.string().max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH).optional(),
});

export const customContentEmbeddableSchema = z.object({
  ...customContentStateSchema.shape,
  ...serializedTitlesSchema.shape,
});

export type CustomContentState = z.output<typeof customContentStateSchema>;
export type CustomContentEmbeddableState = z.output<typeof customContentEmbeddableSchema>;
