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
/** Most attributes one block may offer as suggested filters. */
export const MAX_SUGGESTED_FILTERS = 16;
/** Longest literal field path. */
export const MAX_FIELD_PATH_LENGTH = 512;
/** Most entries in one attribute's `valueLabels`. */
export const MAX_VALUE_LABELS = 64;
/** Longest raw value or label in `valueLabels`. */
export const MAX_VALUE_LABEL_LENGTH = 256;
/** Most distinct identity fields a definition with `dynamic` may group by. */
export const MAX_DYNAMIC_IDENTITY_FIELDS = 8;
/** Most display labels one block may declare: every attribute of every source plus the identity fields. */
export const MAX_DISPLAY_LABELS =
  MAX_SOURCES * MAX_ATTRIBUTES_PER_SOURCE + MAX_DYNAMIC_IDENTITY_FIELDS;
/** Longest display label. */
export const MAX_DISPLAY_LABEL_LENGTH = 256;
/** Longest category slug. */
export const MAX_CATEGORY_LENGTH = 64;
/** Longest icon token. */
export const MAX_ICON_LENGTH = 64;
/** Most columns one block may try, in order, for the entity name. */
export const MAX_NAME_FIELDS = 16;
/** Most default columns one block may declare: every identity field and attribute, plus `last_seen`. */
export const MAX_DEFAULT_COLUMNS = MAX_DISPLAY_LABELS + 1;
/** Most columns one block may render as badges. */
export const MAX_BADGE_COLUMNS = 16;

/** A mapped field path: dot-separated segments, no wildcards, expressions, quoting or whitespace. */
export const LITERAL_FIELD_PATH_PATTERN = /^[A-Za-z0-9_@-]+(?:\.[A-Za-z0-9_@-]+)*$/;
/** One index pattern per source: no whitespace and no comma-separated list. */
export const INDEX_PATTERN_PATTERN = /^[^\s,]+$/;
/** A category slug: lowercase letters, digits, `_` and `-`. */
export const CATEGORY_PATTERN = /^[a-z0-9_-]+$/;

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

/**
 * An attribute name, which becomes an ES|QL column: a field path such as `host.arch`, so a column
 * can carry the OTel semantic convention name while each source reads its own field.
 */
const attributeNameSchema = lazySchema(() =>
  z.string().min(1).max(MAX_ATTRIBUTE_NAME_LENGTH).regex(LITERAL_FIELD_PATH_PATTERN, {
    message: 'must be a field path: dot-separated segments of letters, digits, `_`, `@` and `-`',
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

/** The text shown for one identity field or attribute, under its output name. */
export const dynamicDisplayLabelSchema = lazySchema(() =>
  z.strictObject({
    // An identity field or attribute of the definition; the whole-definition rules check which.
    name: literalFieldPathSchema,
    label: z.string().min(1).max(MAX_DISPLAY_LABEL_LENGTH),
  })
);

/** Adds one issue for each name that an earlier item of the list already has. */
const addDuplicateIssues = (
  ctx: z.RefinementCtx,
  names: string[],
  toIssue: (name: string, index: number) => { path: Array<string | number>; message: string }
) => {
  const seen = new Set<string>();
  names.forEach((name, index) => {
    if (seen.has(name)) {
      ctx.addIssue({ code: 'custom', ...toIssue(name, index) });
    }
    seen.add(name);
  });
};

/** What the inventory reads to generate ES|QL over raw telemetry for an entity type. */
export const dynamicBlockSchema = lazySchema(() =>
  z
    .strictObject({
      sources: z.array(dynamicSourceSchema).min(1).max(MAX_SOURCES),
      // User-facing text for identity fields and attributes. Presentation only: query generation
      // never reads it.
      displayLabels: z.array(dynamicDisplayLabelSchema).max(MAX_DISPLAY_LABELS).optional(),
      // Names of the columns the inventory offers as dropdown filters, in display order. Each is an
      // attribute or an identity field, which the whole-definition rules check.
      suggestedFilters: z.array(literalFieldPathSchema).max(MAX_SUGGESTED_FILTERS).optional(),
      // The rest of the block is presentation only: query generation never reads it, and the
      // whole-definition rules check which columns each list may name.
      // The inventory page the type is listed under, such as `hosts`.
      category: z
        .string()
        .min(1)
        .max(MAX_CATEGORY_LENGTH)
        .regex(CATEGORY_PATTERN, {
          message: 'must be a slug of lowercase letters, digits, `_` and `-`',
        })
        .optional(),
      // An icon token shown beside the entity name; opaque to the store.
      icon: z.string().min(1).max(MAX_ICON_LENGTH).optional(),
      // Columns tried in order for the entity name: the first non-null value names the entity.
      nameFields: z.array(literalFieldPathSchema).min(1).max(MAX_NAME_FIELDS).optional(),
      // Columns visible by default, in display order.
      defaultColumns: z.array(literalFieldPathSchema).max(MAX_DEFAULT_COLUMNS).optional(),
      // Columns whose values render as badges.
      badgeColumns: z.array(literalFieldPathSchema).max(MAX_BADGE_COLUMNS).optional(),
    })
    .superRefine(
      (
        {
          displayLabels = [],
          suggestedFilters = [],
          nameFields = [],
          defaultColumns = [],
          badgeColumns = [],
        },
        ctx
      ) => {
        addDuplicateIssues(
          ctx,
          displayLabels.map(({ name }) => name),
          (name, index) => ({
            path: ['displayLabels', index, 'name'],
            message: `display label name "${name}" is already declared; names are unique within a block`,
          })
        );
        addDuplicateIssues(ctx, suggestedFilters, (name, index) => ({
          path: ['suggestedFilters', index],
          message: `suggested filter "${name}" is listed more than once`,
        }));
        addDuplicateIssues(ctx, nameFields, (name, index) => ({
          path: ['nameFields', index],
          message: `name field "${name}" is listed more than once`,
        }));
        addDuplicateIssues(ctx, defaultColumns, (name, index) => ({
          path: ['defaultColumns', index],
          message: `default column "${name}" is listed more than once`,
        }));
        addDuplicateIssues(ctx, badgeColumns, (name, index) => ({
          path: ['badgeColumns', index],
          message: `badge column "${name}" is listed more than once`,
        }));
      }
    )
);

/** The `dynamic` block of an entity definition. */
export type DynamicBlock = z.infer<typeof dynamicBlockSchema>;
/** One source of a `dynamic` block. */
export type DynamicSource = z.infer<typeof dynamicSourceSchema>;
/** One attribute of a `dynamic` source. */
export type DynamicAttribute = z.infer<typeof dynamicAttributeSchema>;
/** The text shown for one identity field or attribute of a `dynamic` block. */
export type DynamicDisplayLabel = z.infer<typeof dynamicDisplayLabelSchema>;
/** Raw value to canonical label map of a `dynamic` attribute. */
export type DynamicValueLabels = z.infer<typeof dynamicValueLabelsSchema>;
