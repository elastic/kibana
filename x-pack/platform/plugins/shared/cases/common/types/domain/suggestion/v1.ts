/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

const suggestionOwnerSchema = z.enum(['observability', 'security', 'stack']);

export const suggestionRequestSchema = z.object({
  'service.name': z.string().optional(),
  timeRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
});

export type SuggestionRequest = z.infer<typeof suggestionRequestSchema>;

export type SuggestionOwner = z.infer<typeof suggestionOwnerSchema>;
export type SuggestionOwners = SuggestionOwner[];
export interface SuggestionItem<TPayload = Record<string, unknown>> {
  payload: TPayload; // The payload associated with the context
  description: string; // A plaintext description of the context
}

export interface SuggestionResponse<
  TPayload = Record<string, unknown> // Generic type for the payload, defaults to a record of unknown key-value pairs
> {
  key: string; // Unique identifier for suggestion
  // Identifier for the attachment type this suggestion belongs to
  attachmentTypeId: string;
  /* Optional plaintext description of the entire suggestion payload.
   * This is used by the LLM to understand the context, but may also be used by the UI
   * to display a summary of all context items. */
  description?: string;
  data: Array<SuggestionItem<TPayload>>; // The main data of the context, containing 1 or more context items
}
