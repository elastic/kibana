/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { DEFAULT_TIME_FIELD } from '@kbn/alerting-v2-constants';
import {
  validateEsqlQuery,
  validateMinDuration,
  composeEsqlQuery,
  validateComposedEsqlQuery,
} from './validation';
import { durationSchema, queryIntSchema, tagsResponseSchema, tagsSchema } from './common';
import {
  MAX_CONSECUTIVE_BREACHES,
  MAX_DESCRIPTION_LENGTH,
  MAX_ESQL_QUERY_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_GROUPING_FIELDS,
  MAX_KQL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_SEARCH_LENGTH,
  MIN_SCHEDULE_INTERVAL,
  MAX_BULK_ITEMS,
  ID_MAX_LENGTH,
  VERSION_MAX_LENGTH,
  MAX_ARTIFACT_DATA_FIELDS,
  MAX_ARTIFACT_DATA_LENGTH,
  FIND_DEFAULT_PER_PAGE,
  FIND_MAX_RESULT_WINDOW,
} from './constants';
import { bulkErrorSchema } from './bulk_operation_schema';

/** Primitives */

// `abort` makes the length cap final so the parser never runs on oversized input.
export const esqlQuerySchema = z
  .string()
  .min(1)
  .max(MAX_ESQL_QUERY_LENGTH, { abort: true })
  .superRefine((value, ctx) => {
    const error = validateEsqlQuery(value);
    if (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
    }
  });

/** Kind */

export const ruleKindSchema = z
  .union([
    z
      .literal('alert')
      .describe(
        'Creates an alert for each matching group and tracks it until it recovers. Use this when you want to detect a problem and notify or automate a response.'
      ),
    z
      .literal('signal')
      .describe(
        'Stores each match as a rule event you can query. Alerts are not created and notifications are not sent.'
      ),
  ])
  .describe('Whether the rule creates alerts (`alert`) or only stores matching events (`signal`).');

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
    builder_type: z
      .string()
      .max(64)
      .optional()
      .describe(
        'Identifies the rule builder that authored this rule (e.g. "threshold"). Absent for rules authored directly in ES|QL.'
      ),
  })
  .strict()
  .describe('Rule metadata.')
  .meta({ id: 'alerting_rule_metadata' });

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
  .describe('Execution schedule configuration.')
  .meta({ id: 'alerting_rule_schedule' });

/** Query (required) */

/**
 * Appendable ES|QL segment (e.g. `WHERE …`). Conceptually a bare command,
 * but a leading `|` is also tolerated — `composeEsqlQuery` strips it before
 * splicing the segment onto `base`. We only enforce structural bounds here
 * (length, non-empty). Full parser validation only runs when the segment is
 * composed with its `base` via `composeEsqlQuery`.
 */
export const esqlQuerySegmentSchema = z
  .string()
  .min(1)
  .max(MAX_ESQL_QUERY_LENGTH, { abort: true })
  .refine((s) => s.trim().length > 0, { message: 'Segment must not be whitespace-only' });

const breachSchema = z
  .object({
    segment: esqlQuerySegmentSchema.describe(
      'A clause appended to `query.base`, for example `WHERE avg_cpu > 0.85`.'
    ),
  })
  .strict()
  .describe(
    'Breach condition appended to `base`. Omit to treat every row returned by `base` as a breach.'
  )
  .meta({ id: 'alerting_rule_breach' });

export const querySchema = z
  .object({
    base: esqlQuerySchema.describe(
      'The detection query, and the only place a `FROM` lives. Time filters are applied automatically via the lookback window.'
    ),
    breach: breachSchema.optional(),
  })
  .strict()
  .check((ctx) => {
    if (ctx.value.breach) {
      const breachError = validateComposedEsqlQuery(ctx.value.base, ctx.value.breach.segment);
      if (breachError) {
        ctx.issues.push({
          code: 'custom',
          path: ['breach', 'segment'],
          message: breachError,
          input: ctx.value.breach.segment,
        });
      }
    }
  })
  .describe('Detection query configuration.')
  .meta({ id: 'alerting_rule_query' });

export type Query = z.infer<typeof querySchema>;

/** Recovery (alert rules only) */

export const recoveryStrategySchema = z.enum(['no_breach', 'condition', 'query', 'manual']);
export const recoveryStrategy = recoveryStrategySchema.enum;
export type RecoveryStrategy = z.infer<typeof recoveryStrategySchema>;

export const recoverySchema = z
  .discriminatedUnion('strategy', [
    z
      .object({ strategy: z.literal(recoveryStrategy.no_breach) })
      .strict()
      .describe('Recovers a group when it stops appearing in the breach results.')
      .meta({ id: 'alerting_rule_recovery_no_breach' }),
    z
      .object({
        strategy: z.literal(recoveryStrategy.condition),
        segment: esqlQuerySegmentSchema.describe(
          'A clause appended to `query.base`, for example `WHERE avg_cpu < 0.60`.'
        ),
      })
      .strict()
      .describe(
        'Recovers a group when `query.base` plus this segment returns it. Requires `query.breach`.'
      )
      .meta({ id: 'alerting_rule_recovery_condition' }),
    z
      .object({
        strategy: z.literal(recoveryStrategy.query),
        query: esqlQuerySchema.describe('Full ES|QL query for recovery detection.'),
      })
      .strict()
      .describe('Recovers a group when this independent query returns it.')
      .meta({ id: 'alerting_rule_recovery_query' }),
    z
      .object({ strategy: z.literal(recoveryStrategy.manual) })
      .strict()
      .describe('Never recovers automatically. Only user actions close the episode.')
      .meta({ id: 'alerting_rule_recovery_manual' }),
  ])
  .describe(
    'How an alert recovers. Required when `kind` is `alert`; defaults to `no_breach` when omitted. Not allowed when `kind` is `signal`.'
  )
  .meta({ id: 'alerting_rule_recovery' });

export type Recovery = z.infer<typeof recoverySchema>;

/** No data (alert rules only) */

export const noDataStrategySchema = z.enum(['ignore', 'keep_last', 'resolve', 'alert']);
export const noDataStrategy = noDataStrategySchema.enum;
export type NoDataStrategy = z.infer<typeof noDataStrategySchema>;

const NO_DATA_PRESENCE_QUERY_DESCRIPTION =
  'Presence query. When omitted, `query.base` decides whether a group has data.';

/**
 * A no-data mode that classifies absence, and therefore may carry a presence
 * query. `ignore` is the one mode that cannot, since the query would never run.
 */
const classifyingNoDataSchema = (
  strategy: Exclude<NoDataStrategy, 'ignore'>,
  description: string
) =>
  z
    .object({
      strategy: z.literal(strategy),
      query: esqlQuerySchema.optional().describe(NO_DATA_PRESENCE_QUERY_DESCRIPTION),
    })
    .strict()
    .describe(description)
    .meta({ id: `alerting_rule_no_data_${strategy}` });

export const noDataSchema = z
  .discriminatedUnion('strategy', [
    z
      .object({ strategy: z.literal(noDataStrategy.ignore) })
      .strict()
      .describe('Never checks for presence. Runs where a group is absent are not classified.')
      .meta({ id: 'alerting_rule_no_data_ignore' }),
    classifyingNoDataSchema(
      noDataStrategy.keep_last,
      "Keeps the episode's previous status when the rule finds no data."
    ),
    classifyingNoDataSchema(
      noDataStrategy.resolve,
      'Marks the episode `inactive` the first time the rule finds no data.'
    ),
    classifyingNoDataSchema(
      noDataStrategy.alert,
      'Marks the episode `active` when the rule finds no data.'
    ),
  ])
  .describe(
    'What the rule does when it finds no data for a group. Required when `kind` is `alert`; defaults to `ignore` when omitted. Not allowed when `kind` is `signal`.'
  )
  .meta({ id: 'alerting_rule_no_data' });

export type NoData = z.infer<typeof noDataSchema>;

/**
 * True when `breach` carries a segment worth composing. Stored rules migrated
 * from the pre-collapse shape keep their legacy `breach`, which holds either a
 * blank `segment` or a full `query`; both mean "every row of `base` breaches".
 * Simplifies to a `breach != null` check once model version 7 drops the legacy
 * keys.
 */
export const hasBreachCondition = (
  breach?: { segment?: string } | null
): breach is { segment: string } => Boolean(breach?.segment?.trim());

/**
 * A `query` as the ES|QL readers accept it: either the public {@link Query} or a
 * stored one still carrying the pre-collapse keys, whose `breach.segment` is
 * optional and may be blank.
 */
export interface ReadableQuery {
  base: string;
  breach?: { segment?: string } | null;
}

/**
 * Returns the effective breach ES|QL query — what the executor actually runs
 * to detect breaches. `base` on its own when there is no breach segment to
 * append, otherwise `base` composed with `breach.segment`.
 */
export const getBreachEsqlQuery = (query: ReadableQuery): string =>
  hasBreachCondition(query.breach)
    ? composeEsqlQuery(query.base, query.breach.segment)
    : query.base;

/**
 * Returns the recovery ES|QL query for the strategies that run one, otherwise
 * `undefined`. `no_breach` classifies absence from the breach set and `manual`
 * never recovers, so neither has a query.
 */
export const getRecoverEsqlQuery = (
  query: ReadableQuery,
  recovery?: Recovery
): string | undefined => {
  if (recovery?.strategy === recoveryStrategy.condition) {
    return composeEsqlQuery(query.base, recovery.segment);
  }
  if (recovery?.strategy === recoveryStrategy.query) {
    return recovery.query;
  }
  return undefined;
};

/**
 * Returns the presence ES|QL query, or `undefined` when the rule does not
 * classify absence. Without an explicit `no_data.query`, `base` is the
 * presence query.
 */
export const getNoDataEsqlQuery = (query: ReadableQuery, noData?: NoData): string | undefined => {
  if (noData == null || noData.strategy === noDataStrategy.ignore) return undefined;
  return noData.query ?? query.base;
};

/**
 * Returns the "root" ES|QL query — the one containing the `FROM` clause and
 * therefore usable for index-pattern extraction.
 */
export const getRootEsqlQuery = (query: ReadableQuery): string => query.base;

/** State transition (optional, alert-only) */

export const stateTransitionOperatorSchema = z.enum(['AND', 'OR']);
export type StateTransitionOperator = z.infer<typeof stateTransitionOperatorSchema>;

const stateTransitionPhaseSchema = ({
  countDescription,
  timeframeDescription,
  metaId,
}: {
  countDescription: string;
  timeframeDescription: string;
  metaId: string;
}) =>
  z
    .object({
      count: z
        .number()
        .int()
        .min(0)
        .max(MAX_CONSECUTIVE_BREACHES)
        .optional()
        .describe(countDescription),
      timeframe: durationSchema.optional().describe(timeframeDescription),
      operator: stateTransitionOperatorSchema
        .optional()
        .describe(
          'The operator that combines `count` and `timeframe`. `AND` requires both, `OR` requires either. Only allowed when both are set.'
        ),
    })
    .strict()
    .check((ctx) => {
      if (ctx.value.operator != null && (ctx.value.count == null || ctx.value.timeframe == null)) {
        ctx.issues.push({
          code: 'custom',
          path: ['operator'],
          message: 'operator is only allowed when both count and timeframe are set.',
          input: ctx.value.operator,
        });
      }
    })
    .meta({ id: metaId });

export const stateTransitionSchema = z
  .object({
    pending: stateTransitionPhaseSchema({
      countDescription:
        'Number of consecutive matches required before the alert becomes `active`. `0` skips the `pending` phase.',
      timeframeDescription: 'Time window used with `count`, for example `5m` or `15m`.',
      metaId: 'alerting_rule_state_transition_pending',
    })
      .optional()
      .describe('Gating for the `breached` → `active` transition.'),
    recovering: stateTransitionPhaseSchema({
      countDescription:
        'Number of consecutive recoveries required before the alert becomes `inactive`. `0` skips the `recovering` phase.',
      timeframeDescription: 'Time window used with `count`, for example `5m` or `15m`.',
      metaId: 'alerting_rule_state_transition_recovering',
    })
      .optional()
      .describe('Gating for the `recovered` → `inactive` transition.'),
  })
  .strict()
  .describe(
    'Consecutive-match or time requirements before an alert becomes `active` or `inactive`. Applies only when `kind` is `alert`.'
  )
  .meta({ id: 'alerting_rule_state_transition' });

export type StateTransition = z.infer<typeof stateTransitionSchema>;

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
  .describe('Grouping configuration.')
  .meta({ id: 'alerting_rule_grouping' });

/** Artifacts (optional) */

const artifactSchema = z
  .object({
    id: z.string().min(1).max(256).describe('Artifact identifier.'),
    type: z.string().min(1).max(128).describe('Artifact type.'),
    data: z
      .record(z.string().min(1).max(MAX_FIELD_NAME_LENGTH), z.unknown())
      .describe('Structured artifact data.'),
  })
  .strict()
  .check((ctx) => {
    // Only type-agnostic structures belong here. How large a `data` value may be
    // depends on the artifact type, which this schema deliberately does not know:
    // registered types are bounded by their own `dataSchema` (applied server-side,
    // where the artifact-type registry is available). Unregistered types pass
    // through with a limit of MAX_ARTIFACT_DATA_LENGTH so a disabled or rolled-back
    // plugin cannot fail writes.
    if (Object.keys(ctx.value.data).length > MAX_ARTIFACT_DATA_FIELDS) {
      ctx.issues.push({
        code: 'custom',
        path: ['data'],
        message: `Artifact data must have at most ${MAX_ARTIFACT_DATA_FIELDS} fields.`,
        input: ctx.value.data,
      });
    }

    if (JSON.stringify(ctx.value.data).length > MAX_ARTIFACT_DATA_LENGTH) {
      ctx.issues.push({
        code: 'custom',
        path: ['data'],
        message: `Artifact data must not exceed ${MAX_ARTIFACT_DATA_LENGTH} characters when serialized.`,
        input: ctx.value.data,
      });
    }
  })
  .meta({ id: 'alerting_rule_artifact' });

const artifactsSchema = z
  .array(artifactSchema)
  .max(100)
  .check((ctx) => {
    const seen = new Set<string>();
    for (let index = 0; index < ctx.value.length; index++) {
      const id = ctx.value[index].id;
      if (seen.has(id)) {
        ctx.issues.push({
          code: 'custom',
          path: [index, 'id'],
          message: `Artifact id "${id}" must be unique within the rule.`,
          input: id,
        });
      }
      seen.add(id);
    }
  })
  .describe(
    'Optional objects attached to the rule, such as a runbook or a dashboard. Each item has `id`, `type`, and `data`. The shape of `data` depends on `type`. For example, a `runbook` uses `content` and a `dashboard` uses `dashboard_id`. Known types are validated against that shape. Unknown types are stored when `id`, `type`, and `data` are present.'
  );

/** Create rule API schema */

const TIME_FIELD_DESCRIPTION =
  'Document field used as the event time when applying the lookback window.';
const TIME_FIELD_CREATE_DESCRIPTION = `${TIME_FIELD_DESCRIPTION} Defaults to \`@timestamp\`.`;
const TIME_FIELD_UPDATE_DESCRIPTION = `${TIME_FIELD_DESCRIPTION} If omitted, the existing value is kept.`;

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
      .default(DEFAULT_TIME_FIELD)
      .describe(TIME_FIELD_CREATE_DESCRIPTION),
    schedule: scheduleSchema,
    query: querySchema,
    recovery: recoverySchema.optional(),
    no_data: noDataSchema.optional(),
    state_transition: stateTransitionSchema.optional().nullable(),
    grouping: groupingSchema.optional(),
    artifacts: artifactsSchema.optional(),
  })
  .strict();

/** Cross-field validation predicates — shared between the CRUD API and the manage_rule tool. */

/**
 * The shape the predicates below read. Deliberately structural rather than
 * `CreateRuleData`, so the stored attributes and the merged-update attributes
 * can be checked with the same functions.
 */
interface RuleLifecycleShape {
  kind?: string;
  query?: { breach?: { segment?: string } | null };
  recovery?: { strategy?: string } | null;
  no_data?: { strategy?: string } | null;
  state_transition?: { recovering?: unknown } | null;
}

export const isStateTransitionAllowed = (data: {
  kind?: string;
  state_transition?: unknown;
}): boolean => data.kind === 'alert' || data.state_transition == null;

/** Signal rules have no episodes, so there is nothing for recovery or no-data to transition. */
export const isLifecycleConfigAllowedForKind = (data: RuleLifecycleShape): boolean =>
  data.kind !== 'signal' || (data.recovery == null && data.no_data == null);

/**
 * Without a breach segment every row of `base` breaches, so a `base + segment`
 * recovery condition can only return groups that are already breaching, and
 * breach wins. Such a rule could never auto-recover, so reject it rather than
 * store `manual` in disguise.
 */
export const isRecoveryConditionUsableWithBreach = (data: RuleLifecycleShape): boolean =>
  data.recovery?.strategy !== recoveryStrategy.condition || hasBreachCondition(data.query?.breach);

/**
 * Recovery transition thresholds are inert under `recovery.strategy: manual`,
 * so we reject any `state_transition.recovering` block. `count: 0` is not a
 * delay — the episode recovers immediately — so it must not be configured
 * while recovery never happens.
 */
export const isRecoveryTransitionConsistentWithStrategy = (data: RuleLifecycleShape): boolean =>
  data.recovery?.strategy !== recoveryStrategy.manual || data.state_transition?.recovering == null;

/**
 * Shared create-rule cross-field refinements. Applied to both the single-create
 * body and each bulk-create item so the two write paths cannot drift.
 *
 * The remaining invariants are object-local and enforced by the discriminated
 * unions themselves; only the ones that read two different objects live here.
 */
const applyCreateRuleRefinements = <T extends z.ZodObject<z.ZodRawShape>>(schema: T) =>
  schema
    .refine(isStateTransitionAllowed, {
      message: 'state_transition is only allowed when kind is "alert".',
      path: ['state_transition'],
    })
    .refine(isLifecycleConfigAllowedForKind, {
      message: 'Signal rules cannot set recovery or no_data.',
      path: ['recovery'],
    })
    .refine(isRecoveryConditionUsableWithBreach, {
      message: 'recovery.strategy "condition" requires query.breach.',
      path: ['recovery', 'segment'],
    })
    .refine(isRecoveryTransitionConsistentWithStrategy, {
      message: 'state_transition.recovering has no effect when recovery.strategy is "manual".',
      path: ['state_transition', 'recovering'],
    })
    .check((ctx) => {
      const { query, recovery } = ctx.value as {
        query?: z.infer<typeof querySchema>;
        recovery?: Recovery;
      };
      if (query == null || recovery?.strategy !== recoveryStrategy.condition) return;

      const error = validateComposedEsqlQuery(query.base, recovery.segment);
      if (error) {
        ctx.issues.push({
          code: 'custom',
          path: ['recovery', 'segment'],
          message: error,
          input: recovery.segment,
        });
      }
    });

export const createRuleDataSchema = applyCreateRuleRefinements(createRuleDataBaseSchema).meta({
  id: 'alerting_new_rule',
});

export type CreateRuleData = z.infer<typeof createRuleDataSchema>;
export type CreateRuleDataInput = z.input<typeof createRuleDataSchema>;

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
    metadata: metadataSchema
      .partial()
      .extend({
        builder_type: z.string().max(64).optional().nullable(),
        // `null` clears all tags (an empty array is rejected by `.min(1)`, and
        // omitting `tags` preserves the existing ones on a partial update).
        tags: tagsSchema.min(1).nullable().optional(),
      })
      .optional(),
    time_field: z.string().min(1).max(128).optional().describe(TIME_FIELD_UPDATE_DESCRIPTION),
    schedule: scheduleSchema.partial().optional().nullable(),
    query: querySchema.optional(),
    // `recovery` and `no_data` are discriminated unions, so a partial update of
    // one member is not expressible: send the whole object or omit it. They are
    // required on disk for alert rules, so there is nothing to clear with `null`.
    recovery: recoverySchema.optional(),
    no_data: noDataSchema.optional(),
    state_transition: stateTransitionSchema.optional().nullable(),
    grouping: groupingSchema.optional().nullable(),
    artifacts: artifactsSchema.optional().nullable(),
  })
  .strict();

export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;

/** Update rule API body schema — adds OCC version on top of update data. */
export const updateRuleBodySchema = updateRuleDataSchema
  .extend({
    version: z
      .string()
      .min(1)
      .max(VERSION_MAX_LENGTH)
      .optional()
      .describe('The current version of the rule, used for optimistic concurrency control.'),
  })
  .meta({ id: 'alerting_update_rule' });

export type UpdateRuleBody = z.infer<typeof updateRuleBodySchema>;

/** Rule response metadata — write-path fields plus server-managed `version`. */
export const ruleResponseMetadataSchema = metadataSchema
  .extend({
    version: z
      .number()
      .int()
      .min(1)
      .describe(
        'Monotonically increasing integer number representing a rule configuration version, incremented on every change. Used on generated rule events as `rule.version`.'
      ),
  })
  .meta({ id: 'alerting_rule_response_metadata' });

/**
 * Schema for rule response data returned from the API.
 * Extends the base rule schema with server-generated fields.
 */
export const ruleResponseSchema = createRuleDataBaseSchema
  .extend({
    id: z.string().describe('Unique rule identifier.'),
    metadata: ruleResponseMetadataSchema,
    enabled: z.boolean().describe('Whether the rule is enabled.'),
    created_by: z.string().nullable().describe('User who created the rule.'),
    created_at: z.string().describe('ISO timestamp when the rule was created.'),
    updated_by: z.string().nullable().describe('User who last updated the rule.'),
    updated_at: z.string().describe('ISO timestamp when the rule was last updated.'),
    version: z
      .string()
      .optional()
      .describe(
        'The saved object version token of the rule, used for optimistic concurrency control.'
      ),
  })
  .meta({ id: 'alerting_rule_response' });

export type RuleResponse = z.infer<typeof ruleResponseSchema>;

/** Sort field for find rules API. */
export const findRulesSortFieldSchema = z.enum(['kind', 'enabled', 'name']);
export type FindRulesSortField = z.infer<typeof findRulesSortFieldSchema>;

/** Query parameters for the find rules (list) API. */
export const findRulesRequestSchema = z
  .object({
    page: queryIntSchema({ min: 1, max: FIND_MAX_RESULT_WINDOW })
      .optional()
      .describe(
        `The page number to return. Defaults to 1. \`page * per_page\` cannot exceed ${FIND_MAX_RESULT_WINDOW}.`
      ),
    per_page: queryIntSchema({ min: 1, max: 1000 })
      .optional()
      .describe(`The number of rules to return per page. Defaults to ${FIND_DEFAULT_PER_PAGE}.`),
    filter: z.string().max(MAX_KQL_LENGTH).optional().describe('The filter to apply to the rules.'),
    sort_field: findRulesSortFieldSchema.optional().describe('The field to sort rules by.'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('The direction to sort rules.'),
    search: z
      .string()
      .trim()
      .min(1)
      .max(MAX_SEARCH_LENGTH)
      .optional()
      .describe('A text string to search across rule fields.'),
  })
  .refine(
    ({ page = 1, per_page = FIND_DEFAULT_PER_PAGE }) => page * per_page <= FIND_MAX_RESULT_WINDOW,
    { message: `page * per_page cannot exceed ${FIND_MAX_RESULT_WINDOW}.`, path: ['page'] }
  );

export type FindRulesRequest = z.infer<typeof findRulesRequestSchema>;

/** Paginated list response schema. */
export const findRulesResponseSchema = z
  .object({
    items: z.array(ruleResponseSchema).describe('The list of rules.'),
    total: z.number().describe('The total number of rules matching the query.'),
    page: z.number().describe('The current page number.'),
    per_page: z.number().describe('The number of rules per page.'),
  })
  .describe('Paginated list of rules.')
  .meta({ id: 'alerting_rule_list_response' });

export type FindRulesResponse = z.infer<typeof findRulesResponseSchema>;

/** Query parameters for the rule tags API. */
export const ruleTagsParamsSchema = z
  .object({
    search: z
      .string()
      .max(256)
      .optional()
      .describe('Prefix to filter tags by. Returns all most-used tags when omitted.'),
    kind: ruleKindSchema.optional().describe('Restrict tags to rules of the given kind.'),
  })
  .strict();

export type RuleTagsParams = z.infer<typeof ruleTagsParamsSchema>;

/** Rule tags response schema. */
export const ruleTagsResponseSchema = tagsResponseSchema
  .describe('All unique tags across rules.')
  .meta({ id: 'alerting_rule_tags_response' });

export type RuleTagsResponse = z.infer<typeof ruleTagsResponseSchema>;

export const ruleIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(ID_MAX_LENGTH)
  .describe('A rule identifier.');

/**
 * Request body schema for `POST /api/alerting/v2/rules/_bulk_get`.
 */
export const bulkGetRulesParamsSchema = z
  .object({
    ids: z
      .array(ruleIdSchema)
      .min(1)
      .max(MAX_BULK_ITEMS)
      .describe('Rule identifiers to retrieve. The response preserved this order.'),
  })
  .strict()
  .meta({ id: 'alerting_bulk_get_rules_request' });

export type BulkGetRulesParams = z.infer<typeof bulkGetRulesParamsSchema>;

/**
 * Response schema for `POST /api/alerting/v2/rules/_bulk_get`.
 */
export const bulkGetRulesResponseSchema = z
  .object({
    rules: z
      .array(ruleResponseSchema)
      .describe('The requested rules, in the same order as the requested ids.'),
  })
  .meta({ id: 'alerting_bulk_get_rules_response' });

export type BulkGetRulesResponse = z.infer<typeof bulkGetRulesResponseSchema>;

/**
 * A single item in a bulk-create request: the create-rule body plus optional
 * client-supplied `id` and `enabled` (default true). Disabled rules are saved
 * and do not run until enabled.
 */
export const bulkCreateRuleItemSchema = applyCreateRuleRefinements(
  createRuleDataBaseSchema.extend({
    id: ruleIdSchema
      .optional()
      .describe(
        'Optional rule ID. If omitted, Kibana generates one. IDs in the request must be unique.'
      ),
    enabled: z
      .boolean()
      .default(true)
      .describe(
        'If `true` (default), the rule runs on its schedule after creation. If `false`, the rule is saved but does not run until you enable it.'
      ),
  })
).meta({ id: 'alerting_bulk_create_rule_item' });

export type BulkCreateRuleItem = z.infer<typeof bulkCreateRuleItemSchema>;

/**
 * Request body schema for `POST /api/alerting/v2/rules/_bulk_create`.
 */
export const bulkCreateRulesRequestSchema = z
  .object({
    rules: z
      .array(bulkCreateRuleItemSchema)
      .min(1)
      .max(MAX_BULK_ITEMS)
      .describe(`The rules to create. Must contain between 1 and ${MAX_BULK_ITEMS} rules.`),
  })
  .strict()
  .refine(
    (data) => {
      const ids = data.rules
        .map((rule) => rule.id)
        .filter((id): id is string => id != null && id.length > 0);
      return new Set(ids).size === ids.length;
    },
    { message: 'Duplicate rule identifiers in the request.', path: ['rules'] }
  )
  .meta({ id: 'alerting_bulk_create_rules_request' });

export type BulkCreateRulesParams = z.input<typeof bulkCreateRulesRequestSchema>;

/**
 * Response schema for `POST /api/alerting/v2/rules/_bulk_create`.
 * Successfully created rules are returned in `rules`; per-item failures land
 * in `errors`. HTTP 200 even when some items fail (partial success).
 */
export const bulkCreateRulesResponseSchema = z
  .object({
    rules: z
      .array(ruleResponseSchema)
      .describe('Rules that were created. Rules listed in `errors` are not included.'),
    errors: z
      .array(bulkErrorSchema)
      .describe(
        'Errors for rules that could not be created. Each entry includes the rule `id` and the error. Empty when every requested rule was created.'
      ),
  })
  .meta({ id: 'alerting_bulk_create_rules_response' });

export type BulkCreateRulesResponse = z.infer<typeof bulkCreateRulesResponseSchema>;
