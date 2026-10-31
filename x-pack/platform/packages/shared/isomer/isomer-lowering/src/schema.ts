/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';

export type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

// Bound traversal before Zod descends into caller-controlled saved-object state.
export const isBoundedJson = (input: unknown): input is JsonValue => {
  const pending = [{ value: input, depth: 0 }];
  let nodes = 0;
  let characters = 0;
  while (pending.length > 0) {
    const next = pending.pop();
    if (!next || ++nodes > 100_000 || next.depth > 20) {
      return false;
    }
    const { value, depth } = next;
    if (typeof value === 'string') {
      characters += value.length;
      if (value.length > 100_000 || characters > 2_000_000) {
        return false;
      }
    } else if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return false;
      }
    } else if (value !== null && typeof value !== 'boolean') {
      if (typeof value !== 'object') {
        return false;
      }
      if (Object.getOwnPropertySymbols(value).length > 0) {
        return false;
      }
      if (Array.isArray(value)) {
        if (
          value.length > 10_000 ||
          Object.getPrototypeOf(value) !== Array.prototype ||
          Object.keys(value).length !== value.length ||
          Object.entries(Object.getOwnPropertyDescriptors(value)).some(
            ([key, descriptor]) =>
              key !== 'length' &&
              (!descriptor.enumerable ||
                !('value' in descriptor) ||
                !Number.isInteger(Number(key)) ||
                String(Number(key)) !== key ||
                Number(key) < 0 ||
                Number(key) >= value.length)
          )
        ) {
          return false;
        }
        pending.push(...value.map((entry) => ({ value: entry, depth: depth + 1 })));
      } else {
        if (
          Object.getPrototypeOf(value) !== Object.prototype &&
          Object.getPrototypeOf(value) !== null
        ) {
          return false;
        }
        const entries = Object.entries(Object.getOwnPropertyDescriptors(value));
        if (entries.length > 10_000) {
          return false;
        }
        for (const [key, descriptor] of entries) {
          characters += key.length;
          if (
            key.length > 4096 ||
            characters > 2_000_000 ||
            key === '__proto__' ||
            key === 'constructor' ||
            key === 'prototype' ||
            !descriptor.enumerable ||
            !('value' in descriptor)
          ) {
            return false;
          }
          pending.push({ value: descriptor.value, depth: depth + 1 });
        }
      }
    }
  }
  return true;
};

const jsonValueSchema = lazySchema(() => z.custom<JsonValue>(isBoundedJson));
export const jsonObjectSchema = lazySchema(() => z.record(z.string().max(4096), jsonValueSchema));
const identifierSchema = lazySchema(() => z.string().min(1).max(4096));

export const referenceSchema = lazySchema(() =>
  z.object({
    id: identifierSchema,
    name: identifierSchema,
    type: identifierSchema,
  })
);

export const dataViewMetadataSchema = lazySchema(() =>
  z.object({
    id: identifierSchema,
    title: identifierSchema,
    timeFieldName: identifierSchema.optional(),
    fieldFormats: z.record(identifierSchema, jsonObjectSchema).optional(),
    fieldLabels: z.record(identifierSchema, z.string().max(4096)).optional(),
  })
);

export const lensEnvelopeSchema = lazySchema(() =>
  z
    .object({
      id: identifierSchema,
      type: z.literal('lens'),
      attributes: z
        .object({
          title: z.string().max(4096),
          description: z.string().max(16_384).optional(),
          visualizationType: identifierSchema,
          state: z
            .object({
              datasourceStates: jsonObjectSchema,
              visualization: jsonObjectSchema,
              query: jsonObjectSchema.optional(),
              filters: z.array(jsonObjectSchema).max(512).optional(),
            })
            .catchall(jsonValueSchema),
        })
        .catchall(jsonValueSchema),
      references: z.array(referenceSchema).max(512),
    })
    .catchall(jsonValueSchema)
);

export const textColumnSchema = lazySchema(() =>
  z
    .object({
      columnId: identifierSchema,
      fieldName: identifierSchema,
      label: z.string().max(4096).optional(),
      customLabel: z.boolean().optional(),
      meta: jsonObjectSchema.optional(),
      params: jsonObjectSchema.optional(),
    })
    .catchall(jsonValueSchema)
);

export const textDatasourceSchema = lazySchema(() =>
  z
    .object({
      layers: z
        .record(
          identifierSchema,
          z
            .object({
              query: z
                .object({
                  esql: z
                    .string()
                    .min(1)
                    .max(100_000)
                    .refine((query) => query.trim().length > 0, 'Expected nonempty ES|QL'),
                })
                .strict()
                .optional(),
              columns: z.array(textColumnSchema).min(1).max(512),
              timeField: identifierSchema.optional(),
              index: identifierSchema.optional(),
              ignoreGlobalFilters: z.boolean().optional(),
            })
            .catchall(jsonValueSchema)
            .refine(
              (layer) => layer.query !== undefined || layer.table !== undefined,
              'Expected an ES|QL query or an inline table'
            )
        )
        .refine(
          (layers) => Object.keys(layers).length > 0 && Object.keys(layers).length <= 16,
          'Expected between 1 and 16 ES|QL layers'
        ),
    })
    .catchall(jsonValueSchema)
);

export const esqlResponseSchema = lazySchema(() =>
  z
    .object({
      columns: z
        .array(
          z.object({
            name: identifierSchema,
            type: identifierSchema,
          })
        )
        .min(1)
        .max(512),
      values: z.array(z.array(jsonValueSchema).max(512)).max(10_000),
      is_partial: z.boolean().optional(),
      is_running: z.boolean().optional(),
    })
    .passthrough()
);

export type LensEnvelope = z.infer<typeof lensEnvelopeSchema>;
export type DataViewMetadata = z.infer<typeof dataViewMetadataSchema>;
export type LensColumn = z.infer<typeof textColumnSchema>;
