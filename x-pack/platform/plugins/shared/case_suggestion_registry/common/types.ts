/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SuggestionPayload<
  TPayload = Record<string, unknown>, // Generic type for the payload, defaults to a record of unknown key-value pairs
  TMetadata = Record<string, unknown> // Generic type for metadata, defaults to a record of unknown key-value pairs
> {
  suggestionId: string; // Unique identifier for the suggestion
  /* Optional plaintext description of the entire suggestion payload.
   * This is used by the LLM to understand the suggestion, but may also be used by the UI
   * to display a summary of all the attachments. */
  description?: string;
  data: {
    attachments: Array<{
      attachment: Record<string, unknown>; // Details of the attachment
      /* Plaintext description of the individual attachment. Used by the LLM to understand the attachment,
       * but may also be used by the UI to display a summary of the attachment. */
      description: string;
      payload: TPayload; // Payload associated with the attachment
    }>;
    metadata?: TMetadata; // Optional metadata associated with the suggestion
  };
}
