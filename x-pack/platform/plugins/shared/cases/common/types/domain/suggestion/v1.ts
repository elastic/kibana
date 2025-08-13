/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import type { CaseAttachmentWithoutOwner } from '../attachment/v1';

const suggestionOwnerSchema = z.enum(['observability', 'security', 'stack']);

export const suggestionContextRt = z.object({
  'service.name': z.string().optional(),
  timeRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
});

export const suggestionRequestRt = z.object({
  owners: z.array(suggestionOwnerSchema),
  context: suggestionContextRt,
});

export type SuggestionContext = z.infer<typeof suggestionContextRt>;
export type SuggestionRequest = z.infer<typeof suggestionRequestRt>;

export type SuggestionOwner = z.infer<typeof suggestionOwnerSchema>;
export type SuggestionOwners = SuggestionOwner[];
export interface AttachmentItem<TPayload extends {} = {}> {
  /* The payload associated with the attachment. Used primarily to support
   * custom UI rendering */
  payload: TPayload;
  /* A plaintext description of the attachment */
  description: string;
  attachment: CaseAttachmentWithoutOwner;
}

/* Corresponds to each individual suggestion box presented to the user on the Cases UI.
 * Suggestions can contain one or more attachment items. For example, we can return a single
 * "suggestion" to attach 3 different alerts or 2 different monitors in a single box.
 * For every suggestion code authors want to include as a completely separate suggestion box,
 * they should return a separate SuggestionItem. */
export interface SuggestionItem<
  TPayload extends {} = {} // Generic type for the payload, defaults to an empty object
> {
  id: string; // Unique identifier for suggestion
  /* Optional plaintext description of the entire suggestion payload.
   * This is used by the LLM to understand the context, but may also be used by the UI
   * to display a summary of all context items. */
  description?: string;
  data: Array<AttachmentItem<TPayload>>; // The main data of the context, containing 1 or more context items
}

export interface SuggestionResponse<TPayload extends {} = {}> {
  suggestions: SuggestionItem<TPayload>[]; // Array of suggestions
}
