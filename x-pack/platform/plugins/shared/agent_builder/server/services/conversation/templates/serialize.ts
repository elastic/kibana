/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Normalizes a metadata value to a string for storage.
 *
 * The conversation metadata field is mapped as `flattened` in Elasticsearch,
 * which indexes every key as a keyword. All values must therefore be strings
 * so that term/terms queries and aggregations work uniformly. The LLM-facing
 * tool and the template field definitions retain `string | boolean` to keep
 * authoring ergonomics natural; serialization happens here on the write path.
 */
export const serializeMetadataValue = (value: string | boolean): string =>
  typeof value === 'boolean' ? String(value) : value;
