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
import {
  actorSchema,
  durationSchema,
  queryIntSchema,
  tagsResponseSchema,
  tagsSchema,
} from './common';
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

export const queryFormatSchema = z.enum(['composed', 'standalone']);
export const queryFormat = queryFormatSchema.enum;
export type QueryFormat = z.infer<typeof queryFormatSchema>;

/** Recovery strategy. */
export const recoveryStrategySchema = z.union([
  z
    .literal('no_breach')
    .describe('Recovers an alert when the breach query no longer returns matches.'),
  z
    .literal('query')
    .describe(
      'Recovers an alert when a separate recovery query matches. Requires `query.recovery`.'
    ),
  z
    .literal('none')
    .describe(
      'The rule never marks an alert as `recovered`, even after the breach query stops returning matches.'
    ),
]);
export const recoveryStrategy = {
  no_breach: 'no_breach',
  query: 'query',
  none: 'none',
} as const;
export type RecoveryStrategy = z.infer<typeof recoveryStrategySchema>;

/**
 * No-data strategy.
 *
 * Note: `'emit'` is a valid stored/engine value but is temporarily rejected as
 * write-API input (create/update).
 */
export const noDataStrategySchema = z.union([
  z
    .literal('last_known_status')
    .describe("Keeps the alert's last status when the rule finds no data."),
  z
    .literal('emit')
    .describe('Not accepted when creating or updating rules. Do not send this value.'),
  z
    .literal('recover')
    .describe('Marks the alert `inactive` the first time the rule finds no data for the alert.'),
  z.literal('none').describe('Ignores runs where the rule finds no data.'),
]);
export const noDataStrategy = {
  last_known_status: 'last_known_status',
  emit: 'emit',
  recover: 'recover',
  none: 'none',
} as const;
export type NoDataStrategy = z.infer<typeof noDataStrategySchema>;

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

/** Composed wrappers (segment-based, appended to `base`). */

const composedBreachSchema = z
  .object({
    segment: esqlQuerySegmentSchema.describe(
      "A clause appended to the end of the rule's ES|QL query. Required in breach blocks."
    ),
  })
  .strict();

const composedRecoverySchema = z
  .object({
    segment: esqlQuerySegmentSchema.describe('Appendable ES|QL segment for recovery detection.'),
  })
  .strict()
  .describe('Recovery query segment. Present only when recovery_strategy is "query".');

/** Standalone wrappers (full queries). */

const standaloneBreachSchema = z
  .object({
    query: esqlQuerySchema.describe('Full ES|QL query for breach detection (required).'),
  })
  .strict();

const standaloneRecoverySchema = z
  .object({
    query: esqlQuerySchema.describe('Full ES|QL query for recovery detection.'),
  })
  .strict()
  .describe('Recovery query. Present only when recovery_strategy is "query".');

const standaloneNoDataSchema = z
  .object({
    query: esqlQuerySchema.describe('Full ES|QL query that detects presence of data.'),
  })
  .strict()
  .describe('No-data detection query. Present only when no_data_strategy is not "none".');

export const composedQuerySchema = z
  .object({
    format: z.literal(queryFormat.composed),
    base: esqlQuerySchema.describe(
      'Base ES|QL query. Time filters are applied automatically via the lookback window.'
    ),
    breach: composedBreachSchema
      .optional()
      .describe('Breach detection configuration. Omit to treat every base row as a breach.'),
    recovery: composedRecoverySchema
      .optional()
      .describe('Recovery query segment. Required when recovery_strategy is "query".'),
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
    if (ctx.value.recovery) {
      const recoveryError = validateComposedEsqlQuery(ctx.value.base, ctx.value.recovery.segment);
      if (recoveryError) {
        ctx.issues.push({
          code: 'custom',
          path: ['recovery', 'segment'],
          message: recoveryError,
          input: ctx.value.recovery.segment,
        });
      }
    }
  })
  .describe('Composed query: a shared base with appendable breach and recovery segments.')
  .meta({ id: 'alerting_composed_rule_query' });

export const standaloneQuerySchema = z
  .object({
    format: z.literal(queryFormat.standalone),
    breach: standaloneBreachSchema.describe('Breach detection configuration (required).'),
    recovery: standaloneRecoverySchema
      .optional()
      .describe('Recovery query. Required when recovery_strategy is "query".'),
    no_data: standaloneNoDataSchema
      .optional()
      .describe('No-data detection query. Required when no_data_strategy is not "none".'),
  })
  .strict()
  .describe('Standalone queries: independent full queries for breach, recovery, and no_data.')
  .meta({ id: 'alerting_standalone_rule_query' });

export const querySchema = z
  .discriminatedUnion('format', [composedQuerySchema, standaloneQuerySchema])
  .describe('Detection query configuration.')
  .meta({ id: 'alerting_rule_query' });

export type Query = z.infer<typeof querySchema>;

/**
 * Returns the effective breach ES|QL query — what the executor actually runs
 * to detect breaches. For composed queries this is `base` concatenated with
 * `breach.segment`, or just `base` when there is no segment to append. For
 * standalone it's `breach.query` verbatim.
 *
 * A blank segment is treated the same as an omitted `breach` block: storage
 * persists conditionless composed rules as an empty segment, so both shapes
 * reach this function and must produce `base` without a trailing pipe.
 */
export const getBreachEsqlQuery = (query: Query): string => {
  if (query.format === 'standalone') {
    return query.breach.query;
  }
  const segment = query.breach?.segment;
  return segment?.trim() ? composeEsqlQuery(query.base, segment) : query.base;
};

/**
 * Returns the recovery ES|QL query when `recoveryStrategy` is `'query'`,
 * otherwise `undefined`. For composed queries this is `base` +
 * `recovery.segment`; for standalone it's `recovery.query` verbatim.
 */
export const getRecoverEsqlQuery = (
  query: Query,
  strategy?: RecoveryStrategy
): string | undefined => {
  if (strategy !== recoveryStrategy.query || !query.recovery) return undefined;
  if (query.format === 'composed') {
    return composeEsqlQuery(query.base, query.recovery.segment);
  }
  return query.recovery.query;
};

/**
 * Returns the has-data ES|QL query when `noDataStrategy` is not `'none'`,
 * otherwise `undefined`.
 *
 * - Standalone: returns the explicit `no_data.query` block, if configured.
 * - Composed: returns the `base` query.
 */
export const getNoDataEsqlQuery = (query: Query, strategy?: NoDataStrategy): string | undefined => {
  if (strategy == null || strategy === noDataStrategy.none) return undefined;
  if (query.format === 'composed') {
    return query.base;
  }
  if (query.no_data) {
    return query.no_data.query;
  }
  return undefined;
};

/**
 * Returns the "root" ES|QL query — the one containing the `FROM` clause and
 * therefore usable for index-pattern extraction. `base` for composed,
 * `breach.query` for standalone.
 */
export const getRootEsqlQuery = (query: Query): string =>
  query.format === 'composed' ? query.base : query.breach.query;

/** State transition (optional, alert-only) */

export const stateTransitionOperatorSchema = z.enum(['AND', 'OR']);

export const stateTransitionSchema = z
  .object({
    pending_operator: stateTransitionOperatorSchema
      .optional()
      .describe(
        'The operator that combines `pending_count` and `pending_timeframe`. `AND` requires both. `OR` requires either.'
      ),
    pending_count: z
      .number()
      .int()
      .min(0)
      .max(MAX_CONSECUTIVE_BREACHES)
      .optional()
      .describe('Number of consecutive matches required before the alert becomes `active`.'),
    pending_timeframe: durationSchema
      .optional()
      .describe('Time window used with `pending_count`, for example `5m` or `15m`.'),
    recovering_operator: stateTransitionOperatorSchema
      .optional()
      .describe(
        'The operator that combines `recovering_count` and `recovering_timeframe`. `AND` requires both. `OR` requires either.'
      ),
    recovering_count: z
      .number()
      .int()
      .min(0)
      .max(MAX_CONSECUTIVE_BREACHES)
      .optional()
      .describe('Number of consecutive recoveries required before the alert becomes `inactive`.'),
    recovering_timeframe: durationSchema
      .optional()
      .describe('Time window used with `recovering_count`, for example `5m` or `15m`.'),
  })
  .strict()
  .describe(
    'Consecutive-match or time requirements before an alert becomes `active` or `inactive`. Applies only when `kind` is `alert`.'
  )
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

const RECOVERY_STRATEGY_NO_BREACH_AND_QUERY_DESCRIPTION =
  'Set to `no_breach` to recover when the breach query stops returning matches. Set to `query` only when you also provide `query.recovery`.';
const RECOVERY_STRATEGY_CREATE_DESCRIPTION = `The condition that marks an alert recovered. If omitted or set to \`none\`, recovery is disabled: the alert stays \`active\` even after the breach query stops returning matches, and \`state_transition.recovering_count\` / \`recovering_timeframe\` are not allowed. ${RECOVERY_STRATEGY_NO_BREACH_AND_QUERY_DESCRIPTION}`;
const RECOVERY_STRATEGY_UPDATE_DESCRIPTION = `The condition that marks an alert recovered. If omitted, the existing value is kept. Set to \`null\` to clear it (recovery is then disabled). ${RECOVERY_STRATEGY_NO_BREACH_AND_QUERY_DESCRIPTION} With \`none\`, the alert stays \`active\`, even after the breach query stops returning matches. \`state_transition.recovering_count\` and \`recovering_timeframe\` require an explicit \`recovery_strategy\` other than \`none\`.`;

const NO_DATA_STRATEGY_VALUES_DESCRIPTION =
  'If you set `last_known_status` or `recover`, a standalone query (`query.format: standalone`) must include `query.no_data`. A composed query (`query.format: composed`) uses `query.base` to detect whether data is present. The `emit` value is not accepted when creating or updating rules.';
const NO_DATA_STRATEGY_CREATE_DESCRIPTION = `How the rule behaves when it finds no data for a group. If you omit this field or set it to \`none\`, those runs are ignored. ${NO_DATA_STRATEGY_VALUES_DESCRIPTION}`;
const NO_DATA_STRATEGY_UPDATE_DESCRIPTION = `How the rule behaves when it finds no data for a group. If omitted, the existing value is kept. Set to \`null\` to clear it (those runs are then ignored). ${NO_DATA_STRATEGY_VALUES_DESCRIPTION}`;

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
    recovery_strategy: recoveryStrategySchema
      .optional()
      .describe(RECOVERY_STRATEGY_CREATE_DESCRIPTION),
    no_data_strategy: noDataStrategySchema.optional().describe(NO_DATA_STRATEGY_CREATE_DESCRIPTION),
    state_transition: stateTransitionSchema,
    grouping: groupingSchema.optional(),
    artifacts: artifactsSchema.optional(),
  })
  .strict();

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
export const isSignalQueryBreachOnly = (data: {
  kind?: string;
  recovery_strategy?: RecoveryStrategy | null;
  no_data_strategy?: NoDataStrategy | null;
}): boolean => {
  if (data.kind !== 'signal') return true;
  const recoveryOk = data.recovery_strategy == null || data.recovery_strategy === 'none';
  const noDataOk = data.no_data_strategy == null || data.no_data_strategy === 'none';
  return recoveryOk && noDataOk;
};

/** query.recovery is only meaningful when recovery_strategy is "query". */
export const isRecoveryQueryConsistentWithStrategy = (data: {
  recovery_strategy?: RecoveryStrategy | null;
  query?: { recovery?: unknown };
}): boolean => {
  if (data.query?.recovery == null) return true;
  return data.recovery_strategy === recoveryStrategy.query;
};

/** recovery_strategy "query" requires a recovery query block. */
export const isRecoveryQueryProvidedForStrategy = (data: {
  recovery_strategy?: RecoveryStrategy | null;
  query?: { recovery?: unknown };
}): boolean => data.recovery_strategy !== recoveryStrategy.query || data.query?.recovery != null;

/** query.no_data is only meaningful when no_data_strategy is not "none". */
type QueryWithOptionalNoData = Record<string, unknown>;

export const isNoDataQueryConsistentWithStrategy = (data: {
  no_data_strategy?: NoDataStrategy | null;
  query?: QueryWithOptionalNoData;
}): boolean => {
  if (data.query?.no_data == null) return true;
  return data.no_data_strategy != null && data.no_data_strategy !== noDataStrategy.none;
};

/**
 * Standalone rules with `no_data_strategy != 'none'` must provide a
 * `query.no_data` block. Composed rules use their `base` query as the
 * data-presence query, so they don't need a separate block.
 */
export const isNoDataQueryProvidedForStrategy = (data: {
  no_data_strategy?: NoDataStrategy | null;
  query?: QueryWithOptionalNoData;
}): boolean => {
  if (data.no_data_strategy == null || data.no_data_strategy === noDataStrategy.none) {
    return true;
  }
  if (data.query?.format !== queryFormat.standalone) return true;
  return data.query?.no_data != null;
};

/** `no_data_strategy: 'emit'` is temporarily not accepted (see `noDataStrategySchema`). */
export const isNoDataStrategyNotEmit = (data: {
  no_data_strategy?: NoDataStrategy | null;
}): boolean => data.no_data_strategy !== noDataStrategy.emit;

/**
 * Recovery transition thresholds are inert when recovery is disabled
 * (`recovery_strategy` is `none` or unset), so we reject any `recovering_count`
 * (including `0`) or `recovering_timeframe`. `recovering_count: 0` is not a
 * delay — the episode recovers immediately — so it must not be configured while
 * recovery is off.
 */
export const isRecoveryTransitionConsistentWithStrategy = (data: {
  recovery_strategy?: RecoveryStrategy | null;
  state_transition?: {
    recovering_count?: number | null;
    recovering_timeframe?: string | null;
  } | null;
}): boolean => {
  const recoveryEnabled =
    data.recovery_strategy != null && data.recovery_strategy !== recoveryStrategy.none;
  if (recoveryEnabled) {
    return true;
  }

  const stateTransition = data.state_transition;
  if (stateTransition == null) {
    return true;
  }

  const hasRecoveringConfig =
    stateTransition.recovering_count != null || stateTransition.recovering_timeframe != null;
  return !hasRecoveringConfig;
};
const rejectEmitNoDataStrategy = {
  message: 'no_data_strategy "emit" is not currently supported.',
  path: ['no_data_strategy'],
};

/**
 * Shared create-rule cross-field refinements. Applied to both the single-create
 * body and each bulk-create item so the two write paths cannot drift.
 */
const applyCreateRuleRefinements = <T extends z.ZodObject<z.ZodRawShape>>(schema: T) =>
  schema
    .refine(isStateTransitionAllowed, {
      message: 'state_transition is only allowed when kind is "alert".',
      path: ['state_transition'],
    })
    .refine(isSignalUsingStandaloneFormat, {
      message: 'kind "signal" requires query.format "standalone".',
      path: ['query', 'format'],
    })
    .refine(isSignalQueryBreachOnly, {
      message: 'Signal rules cannot set recovery_strategy or no_data_strategy.',
      path: ['recovery_strategy'],
    })
    .refine(isRecoveryQueryConsistentWithStrategy, {
      message: 'query.recovery is only allowed when recovery_strategy is "query".',
      path: ['query', 'recovery'],
    })
    .refine(isRecoveryQueryProvidedForStrategy, {
      message: 'query.recovery is required when recovery_strategy is "query".',
      path: ['query', 'recovery'],
    })
    .refine(isNoDataQueryConsistentWithStrategy, {
      message: 'query.no_data is only allowed when no_data_strategy is set to a non-"none" value.',
      path: ['query', 'no_data'],
    })
    .refine(isNoDataQueryProvidedForStrategy, {
      message:
        'query.no_data is required when no_data_strategy is not "none" for standalone-format rules.',
      path: ['query', 'no_data'],
    })
    .refine(isNoDataStrategyNotEmit, rejectEmitNoDataStrategy)
    .refine(isRecoveryTransitionConsistentWithStrategy, {
      message:
        'state_transition.recovering_count and recovering_timeframe have no effect when recovery is disabled (recovery_strategy is "none" or unset).',
      path: ['state_transition', 'recovering_count'],
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
    recovery_strategy: recoveryStrategySchema
      .optional()
      .nullable()
      .describe(RECOVERY_STRATEGY_UPDATE_DESCRIPTION),
    no_data_strategy: noDataStrategySchema
      .optional()
      .nullable()
      .describe(NO_DATA_STRATEGY_UPDATE_DESCRIPTION),
    state_transition: stateTransitionSchema.nullable(),
    grouping: groupingSchema.optional().nullable(),
    artifacts: artifactsSchema.optional().nullable(),
  })
  .strict()
  .check((ctx) => {
    if (ctx.value.no_data_strategy === noDataStrategy.emit) {
      ctx.issues.push({
        code: 'custom',
        path: ['no_data_strategy'],
        message: rejectEmitNoDataStrategy.message,
        input: ctx.value.no_data_strategy,
      });
    }
  })
  .meta({ id: 'alerting_update_rule' });

export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;

/**
 * Schema for rule response data returned from the API.
 * Extends the base rule schema with server-generated fields.
 */
export const ruleResponseSchema = createRuleDataBaseSchema
  .extend({
    id: z.string().describe('Unique rule identifier.'),
    enabled: z.boolean().describe('Whether the rule is enabled.'),
    created_by: actorSchema.nullable().describe('Actor who created the rule.'),
    created_at: z.string().describe('ISO timestamp when the rule was created.'),
    updated_by: actorSchema.nullable().describe('Actor who last updated the rule.'),
    updated_at: z.string().describe('ISO timestamp when the rule was last updated.'),
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
  .strict()
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
