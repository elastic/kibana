/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

// Bounds are denial-of-service limits for later HTTP input, not design limits.

/** Most sources one `dynamic` block may declare. */
export const MAX_SOURCES = 16;
/** Longest index pattern of a source. */
export const MAX_INDEX_PATTERN_LENGTH = 256;
/** Longest ES|QL filter of a source. */
export const MAX_FILTER_LENGTH = 2000;
/** Most attributes one source may declare. */
export const MAX_ATTRIBUTES_PER_SOURCE = 32;
/** Longest attribute name. */
export const MAX_ATTRIBUTE_NAME_LENGTH = 64;
/** Longest literal field path. */
export const MAX_FIELD_PATH_LENGTH = 512;
/** Most entries in one attribute's `valueLabels`. */
export const MAX_VALUE_LABELS = 64;
/** Longest raw value or label in `valueLabels`. */
export const MAX_VALUE_LABEL_LENGTH = 256;

/** A mapped field path: dot-separated segments, no wildcards, expressions, quoting or whitespace. */
export const LITERAL_FIELD_PATH_PATTERN = /^[A-Za-z0-9_@-]+(?:\.[A-Za-z0-9_@-]+)*$/;
/** An attribute name, which becomes an ES|QL column: lowercase letters, digits and `_`, starting with a letter. */
export const ATTRIBUTE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
/** One index pattern per source: no whitespace and no comma-separated list. */
export const INDEX_PATTERN_PATTERN = /^[^\s,]+$/;

/** Whether `value` is a non-empty literal field path within `MAX_FIELD_PATH_LENGTH`. */
export const isLiteralFieldPath = (value: string): boolean =>
  value.length > 0 &&
  value.length <= MAX_FIELD_PATH_LENGTH &&
  LITERAL_FIELD_PATH_PATTERN.test(value);

/** A literal field path, grouped and filtered on directly so it must push down to the index. */
export const literalFieldPathSchema = lazySchema(() =>
  z.string().min(1).max(MAX_FIELD_PATH_LENGTH).regex(LITERAL_FIELD_PATH_PATTERN, {
    message: 'must be a literal field path (no wildcards, expressions, quoting or whitespace)',
  })
);

const attributeNameSchema = lazySchema(() =>
  z.string().min(1).max(MAX_ATTRIBUTE_NAME_LENGTH).regex(ATTRIBUTE_NAME_PATTERN, {
    message:
      'must be a lowercase identifier (letters, digits and underscores, starting with a letter)',
  })
);

const indexPatternSchema = lazySchema(() =>
  z.string().min(1).max(MAX_INDEX_PATTERN_LENGTH).regex(INDEX_PATTERN_PATTERN, {
    message:
      'must be a single index pattern without whitespace or commas; declare one source per pattern',
  })
);

const valueLabelStringSchema = lazySchema(() => z.string().min(1).max(MAX_VALUE_LABEL_LENGTH));

/**
 * Maps raw values (stringified) to canonical labels, so an OTel numeric pod phase `"2"` and an ECS
 * keyword `"Running"` both read `running`. A raw value without an entry passes through unchanged.
 */
export const dynamicValueLabelsSchema = lazySchema(() =>
  z
    .record(valueLabelStringSchema, valueLabelStringSchema)
    .refine((labels) => Object.keys(labels).length <= MAX_VALUE_LABELS, {
      message: `at most ${MAX_VALUE_LABELS} value labels are allowed`,
    })
);

/** One attribute of a source: the newest value of `field` per entity, shown under `name`. */
export const dynamicAttributeSchema = lazySchema(() =>
  z.strictObject({
    // The output column and the merge key across sources: the same name on several sources is
    // one column.
    name: attributeNameSchema,
    // The field the attribute is read from in this source.
    field: literalFieldPathSchema,
    // Optional raw value to canonical label map; unmapped values pass through.
    valueLabels: dynamicValueLabelsSchema.optional(),
  })
);

/**
 * One index pattern, an optional filter and the attributes read from it. One pattern per source;
 * the same pattern may appear on several sources with different filters.
 */
export const dynamicSourceSchema = lazySchema(() =>
  z
    .strictObject({
      indexPattern: indexPatternSchema,
      // An opaque ES|QL boolean expression narrowing the source to this type's documents. The one
      // piece of ES|QL an author writes; validated for length only, placement is the generator's job.
      filter: z.string().min(1).max(MAX_FILTER_LENGTH).optional(),
      attributes: z.array(dynamicAttributeSchema).max(MAX_ATTRIBUTES_PER_SOURCE).optional(),
    })
    .superRefine(({ attributes = [] }, ctx) => {
      const seen = new Set<string>();
      attributes.forEach(({ name }, index) => {
        if (seen.has(name)) {
          ctx.addIssue({
            code: 'custom',
            path: ['attributes', index, 'name'],
            message: `attribute name "${name}" is already declared in this source; names are unique within a source`,
          });
        }
        seen.add(name);
      });
    })
);

/** What the inventory reads to generate ES|QL over raw telemetry for an entity type. */
export const dynamicBlockSchema = lazySchema(() =>
  z.strictObject({
    sources: z.array(dynamicSourceSchema).min(1).max(MAX_SOURCES),
  })
);

/** The `dynamic` block of an entity definition. */
export type DynamicBlock = z.infer<typeof dynamicBlockSchema>;
/** One source of a `dynamic` block. */
export type DynamicSource = z.infer<typeof dynamicSourceSchema>;
/** One attribute of a `dynamic` source. */
export type DynamicAttribute = z.infer<typeof dynamicAttributeSchema>;
/** Raw value to canonical label map of a `dynamic` attribute. */
export type DynamicValueLabels = z.infer<typeof dynamicValueLabelsSchema>;
