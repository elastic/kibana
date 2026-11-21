/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Maximum length of a sanitized error message. */
export const MAX_SANITIZED_ERROR_MESSAGE_LENGTH = 200;

/**
 * Reduces an error message to text that is safe to persist or log above debug level.
 *
 * Covers messages that quote the payload they failed on: `Failed to parse line "<SSE chunk>"`, where
 * the chunk carries model output, and V8 `JSON.parse` messages, which quote a snippet of the input.
 * The quote is the start of that payload, so the message is cut at the first `"` and bounded, which
 * keeps the leading diagnostic. Provider error bodies without a quote pass through unchanged by
 * design (up to the length bound), because they are the diagnostic.
 */
export const sanitizeErrorMessage = (message: string): string => {
  const quoteIndex = message.indexOf('"');
  const head = quoteIndex === -1 ? message : message.slice(0, quoteIndex);

  return head.trim().slice(0, MAX_SANITIZED_ERROR_MESSAGE_LENGTH);
};
