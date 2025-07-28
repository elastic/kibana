/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

const contextOwnerSchema = z.enum(['observability', 'security', 'stack']);

export const contextRequestSchema = z.object({
  'service.name': z.string().optional(),
  timeRange: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
});

export type ContextRequest = z.infer<typeof contextRequestSchema>;

export type ContextOwner = z.infer<typeof contextOwnerSchema>;
export type ContextOwners = ContextOwner[];
export interface ContextItem<TPayload = Record<string, unknown>> {
  payload: TPayload; // The payload associated with the context
  description: string; // A plaintext description of the context
}

export interface ContextResponse<
  TPayload = Record<string, unknown> // Generic type for the payload, defaults to a record of unknown key-value pairs
> {
  key: string; // Unique identifier for context
  /* Optional plaintext description of the entire context payload.
   * This is used by the LLM to understand the context, but may also be used by the UI
   * to display a summary of all context items. */
  description?: string;
  data: Array<ContextItem<TPayload>>; // The main data of the context, containing 1 or more context items
}
