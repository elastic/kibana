/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared size limits for conversation metadata.
 *
 * These constants are the single source of truth — they are imported by the HTTP
 * route (server/routes/internal/conversations.ts) and the LLM tool
 * (server/services/tools/builtin/set_conversation_metadata.ts). Keep them in sync
 * with the comments in those files.
 */

/** Maximum string length for TEXT / SELECT / DATE / USER / NUMBER values. */
export const MAX_STRING_VALUE = 10_000;

/** Maximum number of elements in a TEXT_ARRAY field. */
export const MAX_ARRAY_ITEMS = 100;

/** Maximum string length per element of a TEXT_ARRAY field. */
export const MAX_ARRAY_ITEM_LENGTH = 2_000;

/** Maximum number of elements in an OBJECT_ARRAY field. */
export const MAX_OBJECT_ARRAY_ITEMS = 100;

/**
 * Maximum nesting depth for OBJECT / OBJECT_ARRAY field values.
 * ES `flattened` depth_limit is 20; this cap keeps us well inside it.
 */
export const MAX_OBJECT_DEPTH = 5;

/** Maximum number of top-level metadata keys on a single conversation. */
export const MAX_METADATA_KEYS = 100;

/**
 * Asserts that a single metadata field value does not exceed structural limits.
 *
 * This is a lightweight pre-check that runs before the more expensive template-aware
 * validation, to give a clear error on obviously oversized payloads without needing
 * the template definition.
 *
 * @throws {Error} with a descriptive message if the value exceeds any limit.
 */
export const assertMetadataValueWithinLimits = (
  fieldName: string,
  value: unknown,
  depth = 0
): void => {
  if (depth > MAX_OBJECT_DEPTH) {
    throw new Error(
      `field "${fieldName}": object nesting exceeds the maximum depth of ${MAX_OBJECT_DEPTH}`
    );
  }

  if (typeof value === 'string' && value.length > MAX_STRING_VALUE) {
    throw new Error(
      `field "${fieldName}": string value exceeds the maximum length of ${MAX_STRING_VALUE}`
    );
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_OBJECT_ARRAY_ITEMS) {
      throw new Error(
        `field "${fieldName}": array has ${value.length} elements, maximum is ${MAX_OBJECT_ARRAY_ITEMS}`
      );
    }
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (typeof item === 'object' && item !== null) {
        assertMetadataValueWithinLimits(`${fieldName}[${i}]`, item, depth + 1);
      } else if (typeof item === 'string' && item.length > MAX_ARRAY_ITEM_LENGTH) {
        throw new Error(
          `field "${fieldName}[${i}]": string value exceeds the maximum length of ${MAX_ARRAY_ITEM_LENGTH}`
        );
      }
    }
    return;
  }

  if (typeof value === 'object' && value !== null) {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      assertMetadataValueWithinLimits(`${fieldName}.${key}`, nested, depth + 1);
    }
  }
};
