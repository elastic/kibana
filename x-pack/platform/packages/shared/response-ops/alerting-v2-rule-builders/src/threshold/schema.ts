/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_FIELD_NAME_LENGTH, MAX_GROUPING_FIELDS } from '@kbn/alerting-v2-schemas';
import { Aggregation, Comparator, AGGREGATIONS_REQUIRING_FIELD } from './types';
import {
  MAX_CONDITIONS,
  MAX_EVALUATIONS,
  MAX_EXPRESSION_LENGTH,
  MAX_INDEX_PATTERN_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_STATS,
} from './constants';

const labelSchema = z.string().min(1).max(MAX_LABEL_LENGTH);
const fieldNameSchema = z.string().min(1).max(MAX_FIELD_NAME_LENGTH);
const expressionSchema = z.string().min(1).max(MAX_EXPRESSION_LENGTH);
const conditionOperatorSchema = z.enum(['AND', 'OR']);

const statSchema = z
  .object({
    label: labelSchema.describe('ES|QL column the aggregation is assigned to.'),
    aggregation: z.enum(Aggregation).describe('Aggregation function.'),
    field: fieldNameSchema
      .optional()
      .describe('Aggregated field. Required for every aggregation except "count".'),
    filter: expressionSchema
      .optional()
      .describe('ES|QL predicate applied inline to this aggregation only.'),
  })
  .strict()
  .refine(
    (stat) => !AGGREGATIONS_REQUIRING_FIELD.includes(stat.aggregation) || Boolean(stat.field),
    {
      message: 'field is required for this aggregation.',
      path: ['field'],
    }
  );

const evaluationSchema = z
  .object({
    label: labelSchema.describe('ES|QL column the derived metric is assigned to.'),
    expression: expressionSchema.describe(
      'ES|QL expression over stat labels and previously declared evaluations.'
    ),
  })
  .strict();

/**
 * `between` / `not_between` need both bounds; every other comparator takes
 * exactly one, so an extra value would silently change meaning.
 */
const RANGE_COMPARATORS: readonly Comparator[] = [
  Comparator.BETWEEN,
  Comparator.NOT_BETWEEN,
] as const;

const conditionSchema = z
  .object({
    metric: labelSchema.describe('Stat or evaluation label being compared.'),
    comparator: z.enum(Comparator).describe('Comparison operator.'),
    threshold: z
      .array(z.number().finite())
      .min(1)
      .max(2)
      .describe('One bound, or a lower and upper bound for "between"/"not_between".'),
  })
  .strict()
  .refine(
    (condition) =>
      condition.threshold.length === (RANGE_COMPARATORS.includes(condition.comparator) ? 2 : 1),
    {
      message:
        'threshold must hold exactly two values for "between"/"not_between" and one otherwise.',
      path: ['threshold'],
    }
  )
  .refine(
    (condition) =>
      !RANGE_COMPARATORS.includes(condition.comparator) ||
      condition.threshold[0] <= condition.threshold[1],
    {
      message: 'threshold lower bound must not exceed the upper bound.',
      path: ['threshold'],
    }
  );

const recoverySchema = z
  .object({
    conditions: z.array(conditionSchema).min(1).max(MAX_CONDITIONS),
    conditionOperator: conditionOperatorSchema,
  })
  .strict();

/**
 * Validates `metadata.builder_fields` for the `threshold` builder. Every string
 * and array is bounded so an unregistered-size payload cannot reach the ES|QL
 * generator.
 */
export const thresholdBuilderFieldsSchema = z
  .object({
    indexPattern: z
      .string()
      .min(1)
      .max(MAX_INDEX_PATTERN_LENGTH)
      .describe('Index pattern queried by the generated FROM command.'),
    timeField: fieldNameSchema.describe('Time field used for the lookback window range filter.'),
    filterQuery: expressionSchema
      .optional()
      .describe('ES|QL predicate applied before aggregation.'),
    stats: z.array(statSchema).min(1).max(MAX_STATS).describe('STATS aggregations.'),
    evaluations: z
      .array(evaluationSchema)
      .max(MAX_EVALUATIONS)
      .describe('EVAL derived metrics computed after aggregation.'),
    alertConditions: z
      .array(conditionSchema)
      .min(1)
      .max(MAX_CONDITIONS)
      .describe('Conditions that must hold for a row to breach.'),
    conditionOperator: conditionOperatorSchema.describe('How alert conditions are combined.'),
    groupByFields: z
      .array(fieldNameSchema)
      .max(MAX_GROUPING_FIELDS)
      .describe('Fields the aggregation is grouped by.'),
    recovery: recoverySchema
      .optional()
      .describe('Custom recovery conditions. Only used when recovery_strategy is "query".'),
  })
  .strict()
  .check((ctx) => {
    const { stats, evaluations, alertConditions, recovery } = ctx.value;

    const duplicateLabel = findDuplicate([
      ...stats.map(({ label }) => label),
      ...evaluations.map(({ label }) => label),
    ]);
    if (duplicateLabel !== undefined) {
      ctx.issues.push({
        code: 'custom',
        path: ['stats'],
        message: `Label "${duplicateLabel}" is declared more than once. Stat and evaluation labels must be unique.`,
        input: duplicateLabel,
      });
    }

    // Conditions can only compare columns the query actually produces, and an
    // evaluation can only build on labels declared before it.
    const statLabels = stats.map(({ label }) => label);
    evaluations.forEach(({ expression }, index) => {
      const visible = new Set([...statLabels, ...evaluations.slice(0, index).map((e) => e.label)]);
      for (const reference of referencedLabels(expression, statLabels, evaluations)) {
        if (!visible.has(reference)) {
          ctx.issues.push({
            code: 'custom',
            path: ['evaluations', index, 'expression'],
            message: `Expression references "${reference}", which is not declared before this evaluation.`,
            input: expression,
          });
        }
      }
    });

    const available = new Set([...statLabels, ...evaluations.map(({ label }) => label)]);
    const checkConditions = (conditions: typeof alertConditions, path: string) =>
      conditions.forEach(({ metric }, index) => {
        if (!available.has(metric)) {
          ctx.issues.push({
            code: 'custom',
            path: [path, index, 'metric'],
            message: `Condition references "${metric}", which is not a declared stat or evaluation label.`,
            input: metric,
          });
        }
      });

    checkConditions(alertConditions, 'alertConditions');
    if (recovery) {
      recovery.conditions.forEach(({ metric }, index) => {
        if (!available.has(metric)) {
          ctx.issues.push({
            code: 'custom',
            path: ['recovery', 'conditions', index, 'metric'],
            message: `Recovery condition references "${metric}", which is not a declared stat or evaluation label.`,
            input: metric,
          });
        }
      });
    }
  })
  .describe('Threshold rule builder parameters.');

export type ThresholdBuilderFieldsInput = z.infer<typeof thresholdBuilderFieldsSchema>;

const findDuplicate = (values: string[]): string | undefined => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
};

/**
 * Returns the known labels an expression mentions. Matching against declared
 * labels rather than parsing identifiers keeps ES|QL function names and literals
 * from being mistaken for metric references.
 */
const referencedLabels = (
  expression: string,
  statLabels: string[],
  evaluations: Array<{ label: string }>
): string[] => {
  const candidates = [...statLabels, ...evaluations.map(({ label }) => label)];
  return candidates.filter((label) =>
    new RegExp(`(^|[^a-zA-Z0-9_.])${escapeRegExp(label)}($|[^a-zA-Z0-9_.])`).test(expression)
  );
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
