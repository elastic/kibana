/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  DEFAULT_ARTIFACT_VALUE_LIMIT,
  ARTIFACT_VALUE_LIMITS,
  MAX_ARTIFACT_VALUE_LIMIT,
  MAX_TAG_LENGTH,
} from '@kbn/alerting-v2-constants';
import { validateEsqlQuery, validateMinDuration } from './validation';
import { durationSchema } from './common';
import { MAX_CONSECUTIVE_BREACHES, MIN_SCHEDULE_INTERVAL } from './constants';

/** Primitives */

const esqlQuerySchema = z
  .string()
  .min(1)
  .max(10000)
  .superRefine((value, ctx) => {
    const error = validateEsqlQuery(value);
    if (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }
  });

/** Kind */

export const ruleKindSchema = z.enum(['alert', 'signal']).describe('The kind of rule.');

export type RuleKind = z.infer<typeof ruleKindSchema>;

/** Metadata (required) */

const metadataSchema = z
  .object({
    name: z.string().min(1).max(256).describe('Unique rule name/identifier.'),
    description: z
      .string()
      .max(1024)
      .optional()
      .describe('Optional human-readable description of the rule.'),
    owner: z.string().max(256).optional().describe('Owner of the rule.'),
    tags: z
      .array(z.string().max(MAX_TAG_LENGTH))
      .max(100)
      .optional()
      .describe('Tags for categorization.'),
  })
  .strict()
  .describe('Rule metadata.');

/** Schedule (required) */

const scheduleEverySchema = durationSchema.superRefine((value, ctx) => {
  const error = validateMinDuration(value, MIN_SCHEDULE_INTERVAL);
  if (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }
});

const scheduleSchema = z
  .object({
    every: scheduleEverySchema.describe('Execution interval, e.g. 1m, 5m.'),
    lookback: durationSchema
      .optional()
      .describe('Lookback window for the query (can also be expressed in ES|QL).'),
  })
  .strict()
  .describe('Execution schedule configuration.');

/** Evaluation (required) */

const evaluationQuerySchema = z
  .object({
    base: esqlQuerySchema.describe('Base ES|QL query.'),
  })
  .strict();

const evaluationSchema = z
  .object({
    query: evaluationQuerySchema,
  })
  .strict()
  .describe('Detection query configuration.');

/** Recovery policy (optional) */

export const recoveryPolicyTypeSchema = z.enum(['query', 'no_breach']);
export const recoveryPolicyType = recoveryPolicyTypeSchema.enum;
export type RecoveryPolicyType = z.infer<typeof recoveryPolicyTypeSchema>;

const recoveryPolicySchema = z
  .object({
    type: recoveryPolicyTypeSchema.describe('Recovery detection type.'),
    query: z
      .object({
        base: esqlQuerySchema.optional().describe('Base ES|QL query for recovery.'),
      })
      .strict()
      .optional()
      .describe('Recovery query when type is query.'),
  })
  .strict()
  .describe('Recovery detection configuration.');

/** State transition (optional, alert-only) */

const stateTransitionOperatorSchema = z.enum(['AND', 'OR']);

const stateTransitionSchema = z
  .object({
    pending_operator: stateTransitionOperatorSchema
      .optional()
      .describe('How to combine count and timeframe for pending.'),
    pending_count: z
      .number()
      .int()
      .min(0)
      .max(MAX_CONSECUTIVE_BREACHES)
      .optional()
      .describe('Consecutive breaches before active.'),
    pending_timeframe: durationSchema.optional().describe('Time window for pending evaluation.'),
    recovering_operator: stateTransitionOperatorSchema
      .optional()
      .describe('How to combine count and timeframe for recovering.'),
    recovering_count: z
      .number()
      .int()
      .min(0)
      .max(MAX_CONSECUTIVE_BREACHES)
      .optional()
      .describe('Consecutive recoveries before inactive.'),
    recovering_timeframe: durationSchema
      .optional()
      .describe('Time window for recovering evaluation.'),
  })
  .strict()
  .describe('Episode state transition thresholds (alert-only).')
  .optional()
  .nullable();

/** Grouping (optional) */

const groupingSchema = z
  .object({
    fields: z
      .array(z.string().max(256))
      .max(16)
      .describe('Fields to group by (convention: use ES|QL GROUP BY fields).'),
  })
  .strict()
  .describe('Grouping configuration.');

/** No data (optional) */

const noDataSchema = z
  .object({
    behavior: z
      .enum(['no_data', 'last_status', 'recover'])
      .optional()
      .describe('Behavior when no data is detected.'),
    timeframe: durationSchema.optional().describe('Time window after which no data is detected.'),
  })
  .strict()
  .describe('No data handling configuration.');

/** Artifacts (optional) */

const artifactSchema = z
  .object({
    id: z.string().min(1).max(256).describe('Artifact identifier.'),
    type: z.string().min(1).max(128).describe('Artifact type.'),
    value: z.string().min(1).max(MAX_ARTIFACT_VALUE_LIMIT).describe('Artifact value.'),
  })
  .strict()
  .check((ctx) => {
    const limit = ARTIFACT_VALUE_LIMITS[ctx.value.type] ?? DEFAULT_ARTIFACT_VALUE_LIMIT;
    if (ctx.value.value.length > limit) {
      ctx.issues.push({
        code: 'custom',
        path: ['value'],
        message: `Artifact value must be at most ${limit} characters for type "${ctx.value.type}".`,
        input: ctx.value.value,
      });
    }
  });

/** Create rule API schema */

/**
 * Base schema without refinements - used for extending in response schema.
 * @internal
 */
const createRuleDataBaseSchema = z
  .object({
    kind: ruleKindSchema,
    metadata: metadataSchema,
    time_field: z
      .string()
      .min(1)
      .max(128)
      .default('@timestamp')
      .describe('Time field used for the lookback window range filter.'),
    schedule: scheduleSchema,
    evaluation: evaluationSchema,
    recovery_policy: recoveryPolicySchema.optional(),
    state_transition: stateTransitionSchema,
    grouping: groupingSchema.optional(),
    no_data: noDataSchema.optional(),
    artifacts: z.array(artifactSchema).optional(),
  })
  .strip();

/**
 * The `.refine` method adds a custom validation to the schema.
 * In this case, it enforces that the `state_transition` property is only allowed when `kind` is "alert".
 * The predicate `data.kind === 'alert' || data.state_transition == null` means:
 * - If the rule kind is "alert", `state_transition` may be present (or absent).
 * - For any other `kind`, `state_transition` must be `null` or `undefined`.
 * If validation fails, the specified error message will be associated with the `state_transition` field.
 */
export const createRuleDataSchema = createRuleDataBaseSchema
  .refine((data) => data.kind === 'alert' || data.state_transition == null, {
    message: 'state_transition is only allowed when kind is "alert".',
    path: ['state_transition'],
  })
  .refine(
    (data) =>
      data.recovery_policy?.type !== 'query' ||
      (data.recovery_policy.query?.base != null && data.recovery_policy.query.base.length > 0),
    {
      message: 'recovery_policy.query.base is required when recovery_policy.type is "query".',
      path: ['recovery_policy', 'query', 'base'],
    }
  );

export type CreateRuleData = z.infer<typeof createRuleDataSchema>;

/** Update rule API schema — all fields optional for partial updates */

export const updateRuleDataSchema = z
  .object({
    metadata: metadataSchema.partial().optional(),
    time_field: z.string().min(1).max(128).optional(),
    schedule: scheduleSchema.partial().optional().nullable(),
    evaluation: z
      .object({
        query: z
          .object({
            base: esqlQuerySchema.optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    recovery_policy: recoveryPolicySchema.optional().nullable(),
    state_transition: stateTransitionSchema.nullable(),
    grouping: groupingSchema.optional().nullable(),
    no_data: noDataSchema.optional().nullable(),
    artifacts: z.array(artifactSchema).optional().nullable(),
    enabled: z.boolean().optional().describe('Whether the rule is enabled.'),
  })
  .strip();

export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;

/**
 * Schema for rule response data returned from the API.
 * Extends the base rule schema with server-generated fields.
 */
export const ruleResponseSchema = createRuleDataBaseSchema.extend({
  id: z.string().describe('Unique rule identifier.'),
  enabled: z.boolean().describe('Whether the rule is enabled.'),
  createdBy: z.string().nullable().describe('User who created the rule.'),
  createdAt: z.string().describe('ISO timestamp when the rule was created.'),
  updatedBy: z.string().nullable().describe('User who last updated the rule.'),
  updatedAt: z.string().describe('ISO timestamp when the rule was last updated.'),
});

export type RuleResponse = z.infer<typeof ruleResponseSchema>;

/** Sort field for find rules API. */
export const findRulesSortFieldSchema = z.enum(['kind', 'enabled', 'name']);
export type FindRulesSortField = z.infer<typeof findRulesSortFieldSchema>;

/** Paginated list response schema. */
export const findRulesResponseSchema = z
  .object({
    items: z.array(ruleResponseSchema).describe('The list of rules.'),
    total: z.number().describe('The total number of rules matching the query.'),
    page: z.number().describe('The current page number.'),
    perPage: z.number().describe('The number of rules per page.'),
  })
  .describe('Paginated list of rules.');

/** Rule tags response schema. */
export const ruleTagsResponseSchema = z
  .object({
    tags: z.array(z.string()).describe('The list of unique rule tags.'),
  })
  .describe('All unique tags across rules.');

/** Bulk operation response schema. */
export const bulkOperationResponseSchema = z
  .object({
    rules: z.array(ruleResponseSchema).describe('The rules that the operation was applied to.'),
    errors: z
      .array(
        z.object({
          id: z.string().describe('The identifier of the rule that failed.'),
          error: z.object({
            message: z.string().describe('The error message.'),
            statusCode: z.number().describe('The HTTP status code.'),
          }),
        })
      )
      .describe('Errors encountered during the bulk operation.'),
  })
  .describe('Result of a bulk rule operation.');
