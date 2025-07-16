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
  data: {
    attachments: Array<{
      attachment: Record<string, unknown>; // Details of the attachment
      payload: TPayload; // Payload associated with the attachment
    }>;
    metadata?: TMetadata; // Optional metadata associated with the suggestion
  };
}
