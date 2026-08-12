/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplateInputType } from '@kbn/agent-builder-common';

/**
 * Normalizes a template field value to a string or string array for storage.
 *
 * The conversation `metadata` field is mapped as `flattened` in Elasticsearch,
 * which indexes every leaf as a keyword. Values must therefore be either strings
 * or arrays of strings so that term/terms queries and aggregations work uniformly.
 *
 * The LLM-facing tool and the template field definitions retain richer types
 * (boolean, number) to keep authoring ergonomics natural; serialization happens
 * here on the write path.
 *
 * - TEXT_ARRAY  → string[] (each item stringified)
 * - Everything else → String(value)
 */
export const serializeMetadataValue = (
  value: string | string[] | number | boolean,
  inputType: ConversationTemplateInputType
): string | string[] => {
  if (inputType === 'TEXT_ARRAY') {
    const arr = Array.isArray(value) ? value : [String(value)];
    return arr.map(String);
  }
  return String(value);
};
