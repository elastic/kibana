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
} from '@kbn/alerting-v2-constants';
import { validateEsqlQuery, validateMinDuration } from './validation';
import { durationSchema, tagsSchema } from './common';
import {
  MAX_CONSECUTIVE_BREACHES,
  MAX_DESCRIPTION_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_GROUPING_FIELDS,
  MAX_NAME_LENGTH,
  MIN_SCHEDULE_INTERVAL,
} from './constants';

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
    name: z
      .string()
      .min(1)
      .max(MAX_NAME_LENGTH)
      .describe('Rule name (must be unique within the space).'),
    description: z
      .string()
      .max(MAX_DESCRIPTION_LENGTH)
      .optional()
      .describe('Human-readable description of the rule.'),
    owner: z.string().max(256).optional().describe('Owner of the rule.'),
    tags: tagsSchema
      .min(1)
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

/** Query (required) */

export const queryFormatSchema = z.enum(['composed', 'standalone']);
export const queryFormat = queryFormatSchema.enum;
export type QueryFormat = z.infer<typeof queryFormatSchema>;

/**
 * Appendable ES|QL fragment (e.g. `| WHERE …`). Not a complete program on its
 * own, so we only enforce length bounds here — full parser validation is
 * applied to the composed `base` it gets appended to.
 */
export const esqlQueryBlockSchema = z.string().min(1).max(10000);

export const composedQuerySchema = z
  .object({
    format: z.literal(queryFormat.composed),
    base: esqlQuerySchema.describe(
      'Base ES|QL query. Time filters are applied automatically via the lookback window.'
    ),
    blocks: z
      .object({
        breach: esqlQueryBlockSchema.describe(
          'Appendable ES|QL block for breach detection (required).'
        ),
        recover: esqlQueryBlockSchema
          .optional()
          .describe('Appendable ES|QL block for recovery detection.'),
      })
      .strict(),
  })
  .strict()
  .describe('Composed query: a shared base with appendable breach/recover blocks.');

export const standaloneQuerySchema = z
  .object({
    format: z.literal(queryFormat.standalone),
    no_data: esqlQuerySchema.optional().describe('Full ES|QL query for no-data detection.'),
    breach: esqlQuerySchema.describe('Full ES|QL query for breach detection (required).'),
    recover: esqlQuerySchema.optional().describe('Full ES|QL query for recovery detection.'),
  })
  .strict()
  .describe('Standalone queries: independent full queries for breach, recover, and no-data.');

export const querySchema = z
  .discriminatedUnion('format', [composedQuerySchema, standaloneQuerySchema])
  .describe('Detection query configuration.');

export type Query = z.infer<typeof querySchema>;

/**
 * Returns the effective breach ES|QL query — what the executor actually runs
 * to detect breaches. For composed queries this is `base` concatenated with
 * `blocks.breach`; for standalone it's `breach` verbatim.
 */
export const getBreachEsqlQuery = (query: Query): string =>
  query.format === 'composed'
    ? query.base.trimEnd() + query.blocks.breach.trimEnd()
    : query.breach.trimEnd();

/**
 * Returns the recovery ES|QL query if the rule has one configured, otherwise
 * `undefined`. For composed queries this is `base` + `blocks.recover`; for
 * standalone it's `recover` verbatim.
 */
export const getRecoverEsqlQuery = (query: Query): string | undefined => {
  if (query.format === 'composed' && query.blocks.recover) {
    return query.base.trimEnd() + query.blocks.recover.trimEnd();
  } else if (query.format === 'standalone' && query.recover) {
    return query.recover.trimEnd();
  }
  return undefined;
};

/**
 * Returns the "root" ES|QL query — the one containing the `FROM` clause and
 * therefore usable for index-pattern extraction. `base` for composed,
 * `breach` for standalone.
 */
export const getRootEsqlQuery = (query: Query): string =>
  query.format === 'composed' ? query.base : query.breach;

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
      .array(z.string().min(1).max(MAX_FIELD_NAME_LENGTH))
      .max(MAX_GROUPING_FIELDS)
      .describe(
        'Fields to group alerts by, e.g. ["host.name", "service.name"]. Should match ES|QL GROUP BY fields.'
      ),
  })
  .strict()
  .describe('Grouping configuration.');

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
 * Base schema without refinements - used for extending in response schema and
 * for introspection by the immutability classification meta-tests.
 * @internal
 */
export const createRuleDataBaseSchema = z
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
    query: querySchema,
    state_transition: stateTransitionSchema,
    grouping: groupingSchema.optional(),
    artifacts: z.array(artifactSchema).max(100).optional(),
  })
  .strip();

/** Cross-field validation predicates — shared between the CRUD API and the manage_rule tool. */

export const isStateTransitionAllowed = (data: {
  kind?: string;
  state_transition?: unknown;
}): boolean => data.kind === 'alert' || data.state_transition == null;

export const isSignalUsingStandaloneFormat = (data: {
  kind?: string;
  query?: { format?: string };
}): boolean => data.kind !== 'signal' || data.query?.format === queryFormat.standalone;

/** Signal rules only run a breach query — no recovery or no-data behaviour. */
export const isSignalQueryBreachOnly = (data: { kind?: string; query?: Query }): boolean => {
  if (data.kind !== 'signal' || data.query?.format !== queryFormat.standalone) return true;
  return data.query.no_data == null && data.query.recover == null;
};

export const createRuleDataSchema = createRuleDataBaseSchema
  .refine(isStateTransitionAllowed, {
    message: 'state_transition is only allowed when kind is "alert".',
    path: ['state_transition'],
  })
  .refine(isSignalUsingStandaloneFormat, {
    message: 'kind "signal" requires query.format "standalone".',
    path: ['query', 'format'],
  })
  .refine(isSignalQueryBreachOnly, {
    message: 'Signal rules cannot set recover or no_data queries.',
    path: ['query'],
  });

export type CreateRuleData = z.infer<typeof createRuleDataSchema>;

/**
 * Top-level fields of the create-rule schema that cannot be changed after the
 * rule has been created. Every other field of {@link createRuleDataBaseSchema}
 * is implicitly mutable.
 *
 * Consumers that implement PUT-style upsert must reject requests that try to
 * mutate one of these. Consumers that implement PATCH-style update must
 * preserve them from storage regardless of the body.
 *
 * Whenever a top-level field is added to {@link createRuleDataBaseSchema}, the
 * snapshot test in `rule_data_schema.test.ts` will fail. Updating the
 * snapshot surfaces the new field in the PR diff so reviewers can confirm
 * whether it should be classified as immutable here instead of being silently
 * mutable.
 */
export const IMMUTABLE_RULE_FIELDS = ['kind'] as const satisfies ReadonlyArray<
  keyof CreateRuleData
>;

export type ImmutableRuleField = (typeof IMMUTABLE_RULE_FIELDS)[number];

/** Update rule API schema — all fields optional for partial updates */

export const updateRuleDataSchema = z
  .object({
    metadata: metadataSchema.partial().optional(),
    time_field: z.string().min(1).max(128).optional(),
    schedule: scheduleSchema.partial().optional().nullable(),
    query: querySchema.optional(),
    state_transition: stateTransitionSchema.nullable(),
    grouping: groupingSchema.optional().nullable(),
    artifacts: z.array(artifactSchema).max(100).optional().nullable(),
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
