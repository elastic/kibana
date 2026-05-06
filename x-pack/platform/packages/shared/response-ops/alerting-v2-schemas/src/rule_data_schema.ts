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

export const esqlQuerySchema = z
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

export const ruleKindSchema = z
  .enum(['alert', 'signal'])
  .describe(
    'Rule kind: "alert" for stateful alerting with transitions, "signal" for stateless detection.'
  );

export type RuleKind = z.infer<typeof ruleKindSchema>;

/** Metadata (required) */

export const metadataSchema = z
  .object({
    name: z.string().min(1).max(256).describe('Rule name (must be unique within the space).'),
    description: z
      .string()
      .max(1024)
      .optional()
      .describe('Human-readable description of the rule.'),
    owner: z.string().max(256).optional().describe('Owner of the rule.'),
    tags: z
      .array(z.string().max(MAX_TAG_LENGTH))
      .max(100)
      .optional()
      .describe('Tags for categorization, e.g. ["production", "infra"].'),
  })
  .strict()
  .describe('Rule metadata.');

/** Schedule (required) */

/** Duration with an additional minimum-interval guard for schedule frequency. */
export const scheduleEverySchema = durationSchema.superRefine((value, ctx) => {
  const error = validateMinDuration(value, MIN_SCHEDULE_INTERVAL);
  if (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }
});

export const scheduleSchema = z
  .object({
    every: scheduleEverySchema.describe('Execution interval, e.g. 1m, 5m, 1h.'),
    lookback: durationSchema
      .optional()
      .describe('Lookback window for the query, e.g. 5m, 1h. Can also be expressed in ES|QL.'),
  })
  .strict()
  .describe('Execution schedule configuration.');

/** Evaluation (required) */

export const evaluationQuerySchema = z
  .object({
    base: esqlQuerySchema.describe(
      'Base ES|QL query. Time filters are applied automatically via the lookback window.'
    ),
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

export const recoveryPolicySchema = z
  .object({
    type: recoveryPolicyTypeSchema.describe('Recovery detection type: "query" or "no_breach".'),
    query: z
      .object({
        base: esqlQuerySchema
          .optional()
          .describe('Recovery ES|QL query. Required when type is "query".'),
      })
      .strict()
      .optional()
      .describe('Recovery query configuration; required when type is "query".'),
  })
  .strict()
  .describe('Recovery detection configuration.');

/** State transition (optional, alert-only) */

export const stateTransitionOperatorSchema = z.enum(['AND', 'OR']);

export const stateTransitionSchema = z
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
      .describe('Consecutive breaches before transitioning to active.'),
    pending_timeframe: durationSchema
      .optional()
      .describe('Time window for pending evaluation, e.g. 5m, 15m.'),
    recovering_operator: stateTransitionOperatorSchema
      .optional()
      .describe('How to combine count and timeframe for recovering.'),
    recovering_count: z
      .number()
      .int()
      .min(0)
      .max(MAX_CONSECUTIVE_BREACHES)
      .optional()
      .describe('Consecutive recoveries before transitioning to inactive.'),
    recovering_timeframe: durationSchema
      .optional()
      .describe('Time window for recovering evaluation, e.g. 5m, 15m.'),
  })
  .strict()
  .describe('Episode state transition thresholds (alert-only).')
  .optional()
  .nullable();

/** Grouping (optional) */

export const groupingSchema = z
  .object({
    fields: z
      .array(z.string().max(256))
      .max(16)
      .describe(
        'Fields to group alerts by, e.g. ["host.name", "service.name"]. Should match ES|QL GROUP BY fields.'
      ),
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
    timeframe: durationSchema
      .optional()
      .describe('Time window after which no data is detected, e.g. 10m, 1h.'),
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

/** Cross-field validation predicates — shared between the CRUD API and the manage_rule tool. */

export const isStateTransitionAllowed = (data: {
  kind?: string;
  state_transition?: unknown;
}): boolean => data.kind === 'alert' || data.state_transition == null;

export const isRecoveryPolicyQueryProvided = (data: {
  recovery_policy?: { type?: string; query?: { base?: string } };
}): boolean =>
  data.recovery_policy?.type !== 'query' ||
  (data.recovery_policy.query?.base != null && data.recovery_policy.query.base.length > 0);

export const createRuleDataSchema = createRuleDataBaseSchema
  .refine(isStateTransitionAllowed, {
    message: 'state_transition is only allowed when kind is "alert".',
    path: ['state_transition'],
  })
  .refine(isRecoveryPolicyQueryProvided, {
    message: 'recovery_policy.query.base is required when recovery_policy.type is "query".',
    path: ['recovery_policy', 'query', 'base'],
  });

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

/** Query parameters for the find rules (list) API. */
export const findRulesParamsSchema = z.object({
  page: z.coerce.number().min(1).optional().describe('The page number to return.'),
  perPage: z.coerce
    .number()
    .min(1)
    .max(1000)
    .optional()
    .describe('The number of rules to return per page.'),
  filter: z.string().optional().describe('The filter to apply to the rules.'),
  sortField: findRulesSortFieldSchema.optional().describe('The field to sort rules by.'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('The direction to sort rules.'),
  search: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('A text string to search across rule fields.'),
});

export type FindRulesParams = z.infer<typeof findRulesParamsSchema>;

/** Paginated list response schema. */
export const findRulesResponseSchema = z
  .object({
    items: z.array(ruleResponseSchema).describe('The list of rules.'),
    total: z.number().describe('The total number of rules matching the query.'),
    page: z.number().describe('The current page number.'),
    perPage: z.number().describe('The number of rules per page.'),
  })
  .describe('Paginated list of rules.');

export type FindRulesResponse = z.infer<typeof findRulesResponseSchema>;

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
    truncated: z
      .boolean()
      .optional()
      .describe(
        'True when the request used a filter that matched more rules than were included in this operation.'
      ),
    totalMatched: z
      .number()
      .optional()
      .describe('Total number of rules matching the filter when truncated is true.'),
  })
  .describe('Result of a bulk rule operation.');

export type BulkOperationResponse = z.infer<typeof bulkOperationResponseSchema>;
