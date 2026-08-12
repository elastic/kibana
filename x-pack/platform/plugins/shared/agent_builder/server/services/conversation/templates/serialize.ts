/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationTemplate,
  ConversationTemplateInputType,
} from '@kbn/agent-builder-common';

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

/**
 * Converts a stored metadata value back to its declared JS type.
 *
 * ES `flattened` stores everything as strings (or string arrays). This function
 * uses the field's `input_type` to recover the original type on reads so that
 * consumers receive booleans, numbers, and arrays rather than their string forms.
 *
 * Keys not declared in the current template pass through untouched — this is the
 * "reads tolerate old shapes" rule, since `getTemplate` always returns the current
 * registry definition regardless of the pinned `template_version`.
 *
 * - TOGGLE       → boolean (true iff stored string === 'true')
 * - NUMBER       → number (falls back to the raw string if NaN)
 * - TEXT_ARRAY   → string[] (wraps a scalar value in an array)
 * - All others   → unchanged string
 */
export const deserializeMetadataValue = (
  value: string | string[],
  inputType: ConversationTemplateInputType
): string | string[] | number | boolean => {
  if (inputType === 'TOGGLE') {
    return value === 'true';
  }
  if (inputType === 'NUMBER') {
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  }
  if (inputType === 'TEXT_ARRAY') {
    return Array.isArray(value) ? value : [value as string];
  }
  return value;
};

/**
 * Deserializes all metadata keys that have a corresponding field definition in the
 * template. Keys the template does not declare are passed through as stored strings.
 */
export const deserializeMetadata = (
  stored: Record<string, string | string[]>,
  template: ConversationTemplate
): Record<string, string | string[] | number | boolean> => {
  const result: Record<string, string | string[] | number | boolean> = {};
  for (const [key, value] of Object.entries(stored)) {
    const def = template.fields[key];
    result[key] = def ? deserializeMetadataValue(value, def.input_type) : value;
  }
  return result;
};
