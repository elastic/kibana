/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Set as a chunk's `refusal` when the provider ends a response with `finish_reason:
 * content_filter` and no refusal text. Anthropic's `stop_reason: refusal`, for one, arrives this
 * way through the Elasticsearch inference API: no content, no tool calls, and nothing but the
 * finish reason to say the response was filtered rather than empty.
 */
export const CONTENT_FILTER_REFUSAL =
  'The response was stopped by the provider content filter (finish_reason: content_filter).';
