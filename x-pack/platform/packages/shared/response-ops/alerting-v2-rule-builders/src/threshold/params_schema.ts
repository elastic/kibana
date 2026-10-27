/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { alertEventSeveritySchema, SEVERITY_LEVELS } from '@kbn/alerting-v2-schemas';
import { Aggregation, Comparator, DEFAULT_SINGLE_SEVERITY_LEVEL } from './form_types';

const MAX_INDEX_PATTERN_LENGTH = 1024;
const MAX_FIELD_NAME_LENGTH = 256;
const MAX_LABEL_LENGTH = 128;
const MAX_EXPRESSION_LENGTH = 4096;
const MAX_STATS = 20;
const MAX_EVALUATIONS = 20;
const MAX_CONDITIONS = 10;
const MAX_GROUP_BY_FIELDS = 10;

const labelSchema = lazySchema(() => z.string().trim().min(1).max(MAX_LABEL_LENGTH));

const conditionOperatorSchema = lazySchema(() =>
  z
    .enum(['AND', 'OR'])
    .default('AND')
    .describe('How multiple conditions are combined. Defaults to `AND`.')
);

const statSchema = lazySchema(() =>
  z
    .object({
      label: labelSchema.describe(
        'Output column name for the aggregated value, e.g. `count` or `avg_cpu`. Conditions and evaluations reference stats by this label.'
      ),
      aggregation: z
        .enum(Aggregation)
        .describe(
          'Aggregation function. Every aggregation except `count` requires `field`. `cardinality` counts distinct values; `p95`/`p99` are percentiles.'
        ),
      field: z
        .string()
        .trim()
        .min(1)
        .max(MAX_FIELD_NAME_LENGTH)
        .optional()
        .describe('Field to aggregate. Omit for `count`.'),
      filter: z
        .string()
        .trim()
        .min(1)
        .max(MAX_EXPRESSION_LENGTH)
        .optional()
        .describe(
          'Optional ES|QL boolean expression that limits the rows this stat counts, e.g. `http.response.status_code >= 500`.'
        ),
    })
    .strict()
);

const evaluationSchema = lazySchema(() =>
  z
    .object({
      label: labelSchema.describe('Output column name for the computed value, e.g. `error_rate`.'),
      expression: z
        .string()
        .trim()
        .min(1)
        .max(MAX_EXPRESSION_LENGTH)
        .describe(
          'ES|QL expression over stat labels or earlier evaluation labels, e.g. `errors / total * 100`.'
        ),
    })
    .strict()
);

const conditionSchema = lazySchema(() =>
  z
    .object({
      metric: labelSchema.describe('Label of the stat or evaluation to compare.'),
      comparator: z
        .enum(Comparator)
        .describe(
          'Comparison operator. `between` and `not_between` require two thresholds (lower, upper).'
        ),
      threshold: z
        .array(z.number())
        .min(1)
        .max(2)
        .describe('Threshold value(s): one value, or `[lower, upper]` for range comparators.'),
    })
    .strict()
);

const recoverySchema = lazySchema(() =>
  z
    .object({
      conditions: z
        .array(conditionSchema)
        .min(1)
        .max(MAX_CONDITIONS)
        .describe('Conditions that mark an active alert as recovered.'),
      conditionOperator: conditionOperatorSchema,
    })
    .strict()
);

const severityLevelSchema = lazySchema(() =>
  z
    .object({
      severity: alertEventSeveritySchema,
      threshold: z
        .number()
        .describe(
          'Value the alert condition metric must cross (in the condition comparator direction) for this severity.'
        ),
    })
    .strict()
);

const severitySchema = lazySchema(() =>
  z
    .object({
      mode: z
        .enum(['single', 'multi'])
        .describe(
          '`single` assigns one severity to every alert. `multi` assigns a severity per threshold band; it requires a `>`, `>=`, `<` or `<=` comparator.'
        ),
      singleLevelSeverity: alertEventSeveritySchema
        .default(DEFAULT_SINGLE_SEVERITY_LEVEL)
        .describe('Severity for every alert in `single` mode.'),
      levels: z
        .array(severityLevelSchema)
        .max(SEVERITY_LEVELS.length)
        .default([])
        .describe(
          'Severity bands for `multi` mode (at least two, one per severity). Each threshold must be beyond the alert condition threshold and more extreme for more severe levels.'
        ),
    })
    .strict()
);

/**
 * Agent-facing params for the threshold rule builder. Mirrors `ThresholdFormValues`
 * without the UI-only `id` fields.
 */
export const thresholdParamsSchema = lazySchema(() =>
  z
    .object({
      indexPattern: z
        .string()
        .trim()
        .min(1)
        .max(MAX_INDEX_PATTERN_LENGTH)
        .describe('Index pattern or data stream to query, e.g. `logs-*`.'),
      timeField: z
        .string()
        .trim()
        .min(1)
        .max(MAX_FIELD_NAME_LENGTH)
        .describe('Date field used for the lookback window, usually `@timestamp`.'),
      filterQuery: z
        .string()
        .trim()
        .min(1)
        .max(MAX_EXPRESSION_LENGTH)
        .optional()
        .describe(
          'Optional ES|QL boolean expression applied before aggregation, e.g. `service.name == "api"`.'
        ),
      stats: z.array(statSchema).min(1).max(MAX_STATS).describe('Aggregations computed per group.'),
      evaluations: z
        .array(evaluationSchema)
        .max(MAX_EVALUATIONS)
        .default([])
        .describe('Optional derived values computed from stats, in order.'),
      alertConditions: z
        .array(conditionSchema)
        .min(1)
        .max(MAX_CONDITIONS)
        .describe('Conditions that must hold for a group to breach.'),
      conditionOperator: conditionOperatorSchema,
      groupByFields: z
        .array(z.string().trim().min(1).max(MAX_FIELD_NAME_LENGTH))
        .max(MAX_GROUP_BY_FIELDS)
        .default([])
        .describe('Fields to group by. Each group is evaluated and alerted on separately.'),
      recovery: recoverySchema
        .optional()
        .describe('Optional explicit recovery conditions. Only applies to `alert` rules.'),
      severity: severitySchema
        .optional()
        .describe('Optional severity. Only supported with exactly one alert condition.'),
    })
    .strict()
    .describe('Parameters for a threshold rule.')
);

export type ThresholdParams = z.infer<typeof thresholdParamsSchema>;
