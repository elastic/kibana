/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isObjectArray = (value: unknown): value is Array<Record<string, unknown>> =>
  Array.isArray(value) && value.length > 0 && value.every(isPlainObject);

/**
 * Flattens a nested document into dotted field paths. Arrays of objects, such as the ECS `nested`
 * field `email.attachments`, become one array of values per sub-field, so each sub-field is scored
 * on its own; other arrays are kept as leaf values.
 */
export const flattenDocument = (
  doc: Record<string, unknown>,
  prefix: string = ''
): Record<string, unknown> =>
  Object.entries(doc).reduce<Record<string, unknown>>((result, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value)) {
      return { ...result, ...flattenDocument(value, path) };
    }
    if (isObjectArray(value)) {
      return { ...result, ...flattenObjectArray(value, path) };
    }
    return { ...result, [path]: value };
  }, {});

const flattenObjectArray = (
  items: ReadonlyArray<Record<string, unknown>>,
  path: string
): Record<string, unknown[]> =>
  items
    .map((item) => flattenDocument(item, path))
    .reduce<Record<string, unknown[]>>(
      (result, flat) =>
        Object.entries(flat).reduce(
          (merged, [field, value]) => ({
            ...merged,
            [field]: [...(merged[field] ?? []), ...(Array.isArray(value) ? value : [value])],
          }),
          result
        ),
      {}
    );
