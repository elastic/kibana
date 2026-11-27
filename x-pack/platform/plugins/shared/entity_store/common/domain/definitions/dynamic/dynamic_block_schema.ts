/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { canonicalizeEsqlFilter } from '../../../esql/canonical_filter';

// Bounds are denial-of-service limits for later HTTP input, not design limits.

/** Most sources one `dynamic` block may declare. */
export const MAX_SOURCES = 16;
/** Most query plans one definition may expand to, since each plan is a concurrent query. */
export const MAX_QUERY_PLANS = 32;
/** A source plan group runs under `TS` and `FROM` at most, and registration cannot know which. */
const ENGINES_PER_PLAN_GROUP = 2;
/** Longest index pattern of a source. */
export const MAX_INDEX_PATTERN_LENGTH = 256;
/** Longest ES|QL filter of a source or metric. */
export const MAX_FILTER_LENGTH = 2000;
/** Most attributes one source may declare. */
export const MAX_ATTRIBUTES_PER_SOURCE = 32;
/** Most metrics one source may declare. */
export const MAX_METRICS_PER_SOURCE = 32;
/** Longest attribute or metric name. */
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

/** Aggregates a metric column may declare. */
export const METRIC_AGGS = [
  'avg',
  'min',
  'max',
  'sum',
  'count',
  'count_distinct',
  'last',
  'sum_rate',
  'max_rate',
  'avg_rate',
  'min_rate',
] as const;

/** Closed set of units the inventory client can format. */
export const METRIC_UNITS = ['percent', 'ratio', 'bytes', 'ms', 's', 'count'] as const;

const COUNT_AGGS: ReadonlySet<(typeof METRIC_AGGS)[number]> = new Set(['count', 'count_distinct']);
/** Aggregates with a true zero (rates), so an offset is meaningless. */
const TRUE_ZERO_AGGS: ReadonlySet<(typeof METRIC_AGGS)[number]> = new Set([
  'sum_rate',
  'max_rate',
  'avg_rate',
  'min_rate',
]);

/** A mapped field path: dot-separated segments, no wildcards, expressions, quoting or whitespace. */
export const LITERAL_FIELD_PATH_PATTERN = /^[A-Za-z0-9_@-]+(?:\.[A-Za-z0-9_@-]+)*$/;
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

/**
 * An attribute or metric name, which becomes an ES|QL column: a field path such as `host.arch`, so a
 * column can carry the OTel semantic convention name while each source reads its own field.
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

const filterSchema = lazySchema(() => z.string().min(1).max(MAX_FILTER_LENGTH));

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
 * One metric of a source: an aggregate of `field` per entity, shown under `name`. There is no
 * per-metric label in this schema.
 */
export const dynamicMetricSchema = lazySchema(() =>
  z
    .strictObject({
      // The output column and the merge key across sources: the same name on several sources is
      // one column.
      name: attributeNameSchema,
      // The field the metric is read from in this source.
      field: literalFieldPathSchema,
      agg: z.enum(METRIC_AGGS),
      // Opaque ES|QL boolean expression narrowing documents for this metric only. Validated for
      // length here; the inventory generator canonicalises and places it.
      filter: filterSchema.optional(),
      // Applied after STATS as `m = m * scale [+ offset]`. Forbidden on count aggregates.
      scale: z.number().finite().optional(),
      // Applied after STATS (and after scale when both are set). Forbidden on count and rate aggs.
      offset: z.number().finite().optional(),
      // How the inventory client formats the value; closed set so list cells can render units.
      unit: z.enum(METRIC_UNITS).optional(),
    })
    .superRefine(({ agg, scale, offset }, ctx) => {
      if (COUNT_AGGS.has(agg) && scale !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['scale'],
          message: `scale is not allowed on agg "${agg}"`,
        });
      }
      if (COUNT_AGGS.has(agg) && offset !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['offset'],
          message: `offset is not allowed on agg "${agg}"`,
        });
      }
      if (TRUE_ZERO_AGGS.has(agg) && offset !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['offset'],
          message: `offset is not allowed on agg "${agg}" (it has a true zero)`,
        });
      }
    })
);

/**
 * One index pattern, an optional filter and the attributes and metrics read from it. One pattern
 * per source; the same pattern may appear on several sources with different filters.
 */
export const dynamicSourceSchema = lazySchema(() =>
  z
    .strictObject({
      indexPattern: indexPatternSchema,
      // An opaque ES|QL boolean expression narrowing the source to this type's documents. The one
      // piece of ES|QL an author writes; validated for length only, placement is the generator's job.
      filter: filterSchema.optional(),
      attributes: z.array(dynamicAttributeSchema).max(MAX_ATTRIBUTES_PER_SOURCE).optional(),
      // At most `MAX_METRICS_PER_SOURCE` per source; the block schema caps the query plans they
      // expand into across sources.
      metrics: z.array(dynamicMetricSchema).max(MAX_METRICS_PER_SOURCE).optional(),
    })
    .superRefine(({ attributes = [], metrics = [] }, ctx) => {
      const attributeNames = new Set<string>();
      attributes.forEach(({ name }, index) => {
        if (attributeNames.has(name)) {
          ctx.addIssue({
            code: 'custom',
            path: ['attributes', index, 'name'],
            message: `attribute name "${name}" is already declared in this source; names are unique within a source`,
          });
        }
        attributeNames.add(name);
      });

      const metricNames = new Set<string>();
      metrics.forEach(({ name }, index) => {
        if (metricNames.has(name)) {
          ctx.addIssue({
            code: 'custom',
            path: ['metrics', index, 'name'],
            message: `metric name "${name}" is already declared in this source; names are unique within a source`,
          });
        }
        if (attributeNames.has(name)) {
          ctx.addIssue({
            code: 'custom',
            path: ['metrics', index, 'name'],
            message: `metric name "${name}" is already declared as an attribute in this source`,
          });
        }
        metricNames.add(name);
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

/**
 * The text a metric filter is grouped by: its canonical re-print, which is what the inventory
 * generator groups on. A filter that does not parse is counted as written; the generator rejects
 * it with the reason when it plans the source.
 */
const getPlanGroupKey = (filter: string | undefined): string | null => {
  if (filter === undefined) {
    return null;
  }
  const canonical = canonicalizeEsqlFilter(filter);
  return canonical.ok ? canonical.filter : filter;
};

/**
 * How many query plans the sources can expand to, before the probes say which engines run. A
 * source gives one plan group per distinct canonical metric filter, and one more for its
 * unfiltered metrics, so a metric-less source is one group. Each group runs under `TS` and `FROM`
 * at most. Two spellings of one expression, such as `state=="idle"` and `state == "idle"`, are one
 * group, as the generator merges them.
 */
const countPossibleQueryPlans = (sources: readonly DynamicSource[]): number =>
  sources.reduce((total, { metrics = [] }) => {
    const planGroups = new Set(metrics.map(({ filter }) => getPlanGroupKey(filter)));
    return total + Math.max(planGroups.size, 1) * ENGINES_PER_PLAN_GROUP;
  }, 0);

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
    })
    .superRefine(({ sources, displayLabels = [], suggestedFilters = [] }, ctx) => {
      const possibleQueryPlans = countPossibleQueryPlans(sources);
      if (possibleQueryPlans > MAX_QUERY_PLANS) {
        ctx.addIssue({
          code: 'custom',
          path: ['sources'],
          message: `the sources can expand to ${possibleQueryPlans} query plans (one per distinct canonical metric filter per source, under TS and FROM); at most ${MAX_QUERY_PLANS} are allowed`,
        });
      }
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
    })
);

/** The `dynamic` block of an entity definition. */
export type DynamicBlock = z.infer<typeof dynamicBlockSchema>;
/** One source of a `dynamic` block. */
export type DynamicSource = z.infer<typeof dynamicSourceSchema>;
/** One attribute of a `dynamic` source. */
export type DynamicAttribute = z.infer<typeof dynamicAttributeSchema>;
/** One metric of a `dynamic` source. */
export type DynamicMetric = z.infer<typeof dynamicMetricSchema>;
/** The text shown for one identity field or attribute of a `dynamic` block. */
export type DynamicDisplayLabel = z.infer<typeof dynamicDisplayLabelSchema>;
/** Raw value to canonical label map of a `dynamic` attribute. */
export type DynamicValueLabels = z.infer<typeof dynamicValueLabelsSchema>;
/** Aggregate of a dynamic metric. */
export type DynamicMetricAgg = (typeof METRIC_AGGS)[number];
/** Unit of a dynamic metric. */
export type DynamicMetricUnit = (typeof METRIC_UNITS)[number];
