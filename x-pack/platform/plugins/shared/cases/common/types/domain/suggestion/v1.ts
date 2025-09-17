/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import type { CaseAttachmentWithoutOwner } from '../attachment/v1';
import {
  GENERAL_CASES_OWNER,
  SECURITY_SOLUTION_OWNER,
  OBSERVABILITY_OWNER,
} from '../../../constants/owners';

const suggestionOwnerSchema = rt.union([
  rt.literal(GENERAL_CASES_OWNER),
  rt.literal(SECURITY_SOLUTION_OWNER),
  rt.literal(OBSERVABILITY_OWNER),
]);

export const suggestionContextRt = rt.intersection([
  rt.strict({
    spaceId: rt.string,
  }),
  rt.partial({
    'service.name': rt.array(rt.string),
    timeRange: rt.strict({
      from: rt.string,
      to: rt.string,
    }),
  }),
]);

export type SuggestionContext = rt.TypeOf<typeof suggestionContextRt>;
export type SuggestionOwner = rt.TypeOf<typeof suggestionOwnerSchema>;
export type SuggestionOwners = SuggestionOwner[];
export type GenericSuggestionPayload = object;

export interface AttachmentItem<
  TPayload extends GenericSuggestionPayload = GenericSuggestionPayload
> {
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
  TPayload extends GenericSuggestionPayload = GenericSuggestionPayload
> {
  id: string; // Unique identifier for suggestion
  /* Optional plaintext description of the entire suggestion payload.
   * This is used by the LLM to understand the context, but may also be used by the UI
   * to display a summary of all context items. */
  description?: string;
  data: Array<AttachmentItem<TPayload>>; // The main data of the context, containing 1 or more context items
}

export interface SuggestionHandlerResponse<
  TPayload extends GenericSuggestionPayload = GenericSuggestionPayload
> {
  suggestions: SuggestionItem<TPayload>[]; // Array of suggestions
}
