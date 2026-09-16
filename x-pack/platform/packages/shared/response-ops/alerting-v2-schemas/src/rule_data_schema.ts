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
  validateEsqlQuerySegment,
  validateMinDuration,
  composeEsqlQuery,
  validateComposedEsqlQuery,
} from './validation';
import {
  actorSchema,
  durationSchema,
  entityIdSchema,
  ENTITY_ID_NOTE,
  ESTIMATED_COUNT_NOTE,
  queryIntSchema,
  tagsResponseSchema,
  tagsSchema,
} from './common';
import {
  ID_MAX_LENGTH,
  MAX_CONSECUTIVE_BREACHES,
  MAX_DESCRIPTION_LENGTH,
  MAX_ESQL_QUERY_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_PER_PAGE,
  MAX_GROUPING_FIELDS,
  MAX_KQL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_SEARCH_LENGTH,
  MIN_SCHEDULE_INTERVAL,
  MAX_BULK_ITEMS,
  MAX_ARTIFACT_DATA_FIELDS,
  MAX_ARTIFACT_DATA_LENGTH,
  FIND_DEFAULT_PER_PAGE,
  FIND_MAX_RESULT_WINDOW,
  MAX_BUILDER_FIELDS_KEYS,
  MAX_BUILDER_TYPE_LENGTH,
  MAX_SIGNATURE_ID_LENGTH,
} from './constants';
import { bulkErrorSchema } from './bulk_operation_schema';

/** Rule ownership — discriminated union (rule-ownership.md "The ownership object"). */

/** A rule whose lifecycle the owning solution manages. Writes are gated. */
export const managedRuleOwnershipSchema = z
  .object({
    managed: z.literal(true),
    /** The solution that manages the rule's lifecycle. 'security' for detection rules. */
    solution: z.string(),
    /** The domain within the solution. 'detection' for detection rules; 'cloud' or 'benchmark' are plausible later. */
    domain: z.string(),
  })
  .strict();

/** A rule that any caller may write through the generic API. */
export const unmanagedRuleOwnershipSchema = z
  .object({
    managed: z.literal(false),
    /**
     * Who initiated the create, when known. For in-process callers, the id the
     * calling plugin declares (e.g. 'significantEvents'). Absent for direct
     * API requests. Max 128 chars.
     */
    app: z.string().max(128).optional(),
  })
  .strict();

/**
 * Server-derived ownership union. Immutable for the rule's life. Never accepted
 * from a request body — appears only in the response schema.
 *
 * Ref: rule-ownership.md "The ownership object"
 */
export const ruleOwnershipSchema = z.discriminatedUnion('managed', [
  managedRuleOwnershipSchema,
  unmanagedRuleOwnershipSchema,
]);

export type ManagedRuleOwnership = z.infer<typeof managedRuleOwnershipSchema>;
export type UnmanagedRuleOwnership = z.infer<typeof unmanagedRuleOwnershipSchema>;
export type RuleOwnership = z.infer<typeof ruleOwnershipSchema>;

/** Rule source — three-variant discriminated union (rule-source.md). */

/** The rule's content is the user's own. The default. */
export const internalRuleSourceSchema = z
  .object({
    type: z.literal('internal'),
    /** The rule's content version. Starts at 1; moved only by the rule's owner. */
    version: z.number().int().min(1).describe('Content version. Starts at 1.'),
  })
  .strict();

/** The rule was created from a rule template and the content is the user's since. */
export const templateRuleSourceSchema = z
  .object({
    type: z.literal('template'),
    version: z.number().int().min(1).describe('Content version. Starts at 1.'),
    /** The id of the template the rule was created from. */
    id: z
      .string()
      .min(1)
      .max(ID_MAX_LENGTH)
      .describe('The id of the template the rule was created from.'),
  })
  .strict();

/** The rule's content is distributed content, installed from an external asset. */
export const externalRuleSourceSchema = z
  .object({
    type: z.literal('external'),
    /** The version of the asset the rule was installed from or last upgraded to. */
    version: z.number().int().min(1).describe('Asset version the rule is synced to.'),
    /** The stable id of the external asset. */
    id: z.string().min(1).max(ID_MAX_LENGTH).describe('The stable id of the external asset.'),
  })
  .strict();

/**
 * Discriminated union of the three rule source variants.
 *
 * `internal` — user-created rule; content belongs to the user.
 * `template` — rule instantiated from a template; records where the starting
 *              content came from but the user owns it from that point on.
 * `external` — rule whose content is distributed content, installed from an
 *              external asset such as an Elastic prebuilt rule package.
 *
 * Every variant carries a content `version`. `template` and `external` also
 * carry the `id` of the asset the rule originates from. `type` and `id` are
 * immutable after creation; only `version` is owner-writable.
 *
 * Ref: rule-source.md "The three variants"
 */
export const ruleSourceSchema = z.discriminatedUnion('type', [
  internalRuleSourceSchema,
  templateRuleSourceSchema,
  externalRuleSourceSchema,
]);

export type RuleSource = z.infer<typeof ruleSourceSchema>;

/** Primitives */

// `abort` makes the length cap final so the parser never runs on oversized input.
export const esqlQuerySchema = z
  .string()
  .min(1)
  .max(MAX_ESQL_QUERY_LENGTH, { abort: true })
  .superRefine((value, ctx) => {
    const error = validateEsqlQuery(value);
    if (error) {
      ctx.addIssue({ code: 'custom', message: error });
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

const builderFieldsSchema = z
  .record(z.string().min(1).max(MAX_FIELD_NAME_LENGTH), z.unknown())
  .check((ctx) => {
    if (Object.keys(ctx.value).length > MAX_BUILDER_FIELDS_KEYS) {
      ctx.issues.push({
        code: 'custom',
        message: `builder_fields must have at most ${MAX_BUILDER_FIELDS_KEYS} top-level fields.`,
        input: ctx.value,
      });
    }
  })
  .describe(
    'Structured parameters for the rule builder identified by `builder_type`. The server generates the rule query from these fields.'
  );

const builderTypeSchema = z
  .string()
  .min(1)
  .max(MAX_BUILDER_TYPE_LENGTH)
  .describe(
    'Identifies the rule builder that authored this rule (e.g. "threshold"). Absent for rules authored directly in ES|QL.'
  );

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
    /**
     * Stable logical-rule identifier. Callers may supply an opaque string (1–256
     * chars) at creation; when absent the framework generates a UUID v4. The value
     * is immutable after creation: an update or PUT-replace omitting the field
     * keeps the stored value, and sending a differing value is rejected with 409.
     * Unique within a space (same value in two spaces represents the same logical
     * rule installed twice, which is the expected cross-space use case).
     */
    signature_id: z
      .string()
      .min(1)
      .max(MAX_SIGNATURE_ID_LENGTH)
      .optional()
      .describe(
        'Stable logical-rule identifier. Optional at creation — generated when absent. Immutable after creation.'
      ),
    // `builder_type` is indexed and filterable: the Detections API needs to filter
    // by it. On the PUT (upsert replace) path `null` explicitly clears a stored
    // builder relationship; that path uses `replaceRuleBodySchema`, which extends
    // this schema with a nullable override. This base schema does not accept null
    // so that POST (create) and the rule response never advertise it.
    // Ref: rule-types.md "The discriminator must be indexed and filterable"
    //      rule-types.md "What this design needs from the framework"
    builder_type: builderTypeSchema.optional(),
    builder_fields: builderFieldsSchema.optional(),
    /**
     * Provenance of the rule's content. Optional on create — defaults to
     * `{ type: 'internal', version: 1 }` when absent. `type` and `id` are
     * immutable after creation; only `version` is owner-writable. Response-only
     * in the sense that it is always present in responses (the framework stamps
     * it at create time if the caller omits it).
     *
     * Ref: rule-source.md "Who writes the source"
     */
    source: ruleSourceSchema.optional(),
  })
  .strict()
  .describe('Rule metadata.')
  .meta({ id: 'alerting_rule_metadata' });

/** Schedule (required) */

/** Duration with an additional minimum-interval guard for schedule frequency. */
export const scheduleEverySchema = durationSchema.superRefine((value, ctx) => {
  const error = validateMinDuration(value, MIN_SCHEDULE_INTERVAL);
  if (error) {
    ctx.addIssue({ code: 'custom', message: error });
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
 * splicing the segment onto `base`. Parsed on its own rather than only as part
 * of the composed query, because the parser silently drops a command it cannot
 * read: an unparseable segment composes to bare `base`, which would store a
 * rule where every row matches.
 */
export const esqlQuerySegmentSchema = z
  .string()
  .min(1)
  .max(MAX_ESQL_QUERY_LENGTH, { abort: true })
  .refine((s) => s.trim().length > 0, {
    message: 'Segment must not be whitespace-only',
    abort: true,
  })
  .superRefine((value, ctx) => {
    const error = validateEsqlQuerySegment(value);
    if (error) {
      ctx.addIssue({ code: 'custom', message: error });
    }
  });

const breachSchema = z
  .object({
    segment: esqlQuerySegmentSchema.describe(
      "ES|QL clause appended to `query.base`, for example `WHERE avg_cpu > 0.85`. Don't include a `FROM` clause."
    ),
  })
  .strict()
  .describe(
    'Optional ES|QL clause appended to `query.base`. If omitted, every row from `query.base` is a match, and a `no_data` strategy other than `ignore` then requires `no_data.query`.'
  )
  .meta({ id: 'alerting_rule_breach' });

/**
 * Composing re-parses both parts, so it repeats the error of whichever part is
 * already invalid. The composition checks stand down once one has reported.
 */
const hasIssueOn = (
  issues: ReadonlyArray<{ path?: PropertyKey[] }>,
  ...fields: string[]
): boolean => issues.some((issue) => fields.some((field) => issue.path?.[0] === field));

export const querySchema = z
  .object({
    base: esqlQuerySchema.describe(
      'ES|QL query that specifies the data to evaluate. Must include a `FROM` clause. Kibana applies the time filter from `schedule.lookback` using `time_field`.'
    ),
    breach: breachSchema.optional(),
  })
  .strict()
  .check((ctx) => {
    if (!ctx.value.breach || hasIssueOn(ctx.issues, 'base', 'breach')) return;

    const breachError = validateComposedEsqlQuery(ctx.value.base, ctx.value.breach.segment);
    if (breachError) {
      ctx.issues.push({
        code: 'custom',
        path: ['breach', 'segment'],
        message: breachError,
        input: ctx.value.breach.segment,
      });
    }
  })
  .describe(
    'ES|QL query the rule evaluates. `base` is required. `breach` is an optional clause appended to it.'
  )
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
      .describe(
        'Recovers the alert episode when its group no longer appears in the breach results.'
      )
      .meta({ id: 'alerting_rule_recovery_no_breach' }),
    z
      .object({
        strategy: z.literal(recoveryStrategy.condition),
        segment: esqlQuerySegmentSchema.describe(
          "ES|QL clause appended to `query.base`, for example `WHERE avg_cpu < 0.60`. Don't include a `FROM` clause."
        ),
      })
      .strict()
      .describe(
        'Recovers the alert episode when `query.base` plus `segment` returns the group. Requires `query.breach`.'
      )
      .meta({ id: 'alerting_rule_recovery_condition' }),
    z
      .object({
        strategy: z.literal(recoveryStrategy.query),
        query: esqlQuerySchema.describe(
          'Independent ES|QL query, including its own `FROM` clause. A matching group recovers the alert episode.'
        ),
      })
      .strict()
      .describe('Recovers the alert episode when this separate query returns the group.')
      .meta({ id: 'alerting_rule_recovery_query' }),
    z
      .object({ strategy: z.literal(recoveryStrategy.manual) })
      .strict()
      .describe(
        'Does not recover automatically. Close the alert episode with a user action. `state_transition.recovering` has no effect.'
      )
      .meta({ id: 'alerting_rule_recovery_manual' }),
  ])
  .describe(
    'When an alert episode recovers. Required when `kind` is `alert`. Not allowed when `kind` is `signal`.'
  )
  .meta({ id: 'alerting_rule_recovery' });

export type Recovery = z.infer<typeof recoverySchema>;

/** No data (alert rules only) */

/**
 * No-data strategy. `alert` is a valid stored and engine value, but the create
 * and update APIs reject it (see {@link isNoDataStrategyWritable}).
 */
export const noDataStrategySchema = z.enum(['ignore', 'keep_last', 'resolve', 'alert']);
export const noDataStrategy = noDataStrategySchema.enum;
export type NoDataStrategy = z.infer<typeof noDataStrategySchema>;

const NO_DATA_PRESENCE_QUERY_DESCRIPTION =
  'Optional ES|QL query that checks whether a group has data. If omitted, `query.base` is used, which then has to be a presence query in its own right — so `query.breach` is required.';

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
      .describe(
        'Does not check whether a group still has data. Missing groups do not produce `no_data` events.'
      )
      .meta({ id: 'alerting_rule_no_data_ignore' }),
    classifyingNoDataSchema(
      noDataStrategy.keep_last,
      "Holds the alert episode's current status when the rule finds no data."
    ),
    classifyingNoDataSchema(
      noDataStrategy.resolve,
      'Closes the alert episode the first time the rule finds no data for a group.'
    ),
    classifyingNoDataSchema(
      noDataStrategy.alert,
      'Marks an existing alert episode `active` when the rule finds no data. It never opens an episode for a group that has not breached. Not accepted when creating or updating rules.'
    ),
  ])
  .describe(
    'What the rule does when a group has no data. Required when `kind` is `alert`. Not allowed when `kind` is `signal`. Any strategy other than `ignore` requires either `query.breach` or `no_data.query`, so that a group with no data can be told apart from one that stopped breaching.'
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

export const stateTransitionOperatorSchema = z.enum(['and', 'or']);
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
          'When both `count` and `timeframe` are set, `and` requires both and `or` requires either. Allowed only when both fields are present.'
        ),
    })
    .strict()
    .check((ctx) => {
      const { count, timeframe, operator } = ctx.value;

      // A phase exists to hold a threshold; an empty one reads as configured
      // but gates nothing, and the stored shape has no way to express it.
      if (count == null && timeframe == null) {
        ctx.issues.push({
          code: 'custom',
          message: 'A state transition phase must set count or timeframe.',
          input: ctx.value,
        });
        return;
      }

      if (operator != null && (count == null || timeframe == null)) {
        ctx.issues.push({
          code: 'custom',
          path: ['operator'],
          message: 'operator is only allowed when both count and timeframe are set.',
          input: operator,
        });
      }
    })
    .meta({ id: metaId });

export const stateTransitionSchema = z
  .object({
    pending: stateTransitionPhaseSchema({
      countDescription:
        'Consecutive matches required before the alert episode becomes `active`. Set to `0` to open it on the first match.',
      timeframeDescription:
        'Duration the condition must hold, for example `5m`. Combine with `count` using `operator`.',
      metaId: 'alerting_rule_state_transition_pending',
    })
      .optional()
      .describe('Delay before a match opens an alert episode.'),
    recovering: stateTransitionPhaseSchema({
      countDescription:
        'Consecutive recoveries required before the alert episode becomes `inactive`. Set to `0` to close it on the first recovery.',
      timeframeDescription:
        'Duration the condition must hold, for example `5m`. Combine with `count` using `operator`.',
      metaId: 'alerting_rule_state_transition_recovering',
    })
      .optional()
      .describe(
        'Delay before a recovered match closes the alert episode. Has no effect when `recovery.strategy` is `manual`.'
      ),
  })
  .strict()
  .describe(
    'Specifies how many consecutive matches, or how long a condition must hold, before an alert episode becomes `active` or `inactive`. Allowed only when `kind` is `alert`.'
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
    id: z.string().min(1).max(ID_MAX_LENGTH).describe('Artifact identifier.'),
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
  'Document field Kibana uses with `schedule.lookback` to time-filter `query.base`.';
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
      .max(MAX_FIELD_NAME_LENGTH)
      .default(DEFAULT_TIME_FIELD)
      .describe(TIME_FIELD_DESCRIPTION),
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
  no_data?: { strategy?: string; query?: string } | null;
  state_transition?: { recovering?: unknown } | null;
}

export const isStateTransitionAllowed = (data: {
  kind?: string;
  state_transition?: unknown;
}): boolean => data.kind === 'alert' || data.state_transition == null;

/** The two objects that describe an alert rule's episode lifecycle. */
const LIFECYCLE_FIELDS = ['recovery', 'no_data'] as const;

/** Signal rules have no episodes, so there is nothing for recovery or no-data to transition. */
export const isLifecycleConfigAllowedForKind = (data: RuleLifecycleShape): boolean =>
  data.kind !== 'signal' || (data.recovery == null && data.no_data == null);

/**
 * Alert rules spell out their whole lifecycle. The server never fills either
 * object in, so absence is a rejected write rather than a default, and no
 * reader has to interpret a missing `recovery` or `no_data`.
 */
export const isLifecycleConfigPresentForKind = (data: RuleLifecycleShape): boolean =>
  data.kind !== 'alert' || (data.recovery != null && data.no_data != null);

/**
 * Without a breach segment every row of `base` breaches, so a `base + segment`
 * recovery condition can only return groups that are already breaching, and
 * breach wins. Such a rule could never auto-recover, so reject it rather than
 * store `manual` in disguise.
 */
export const isRecoveryConditionUsableWithBreach = (data: RuleLifecycleShape): boolean =>
  data.recovery?.strategy !== recoveryStrategy.condition || hasBreachCondition(data.query?.breach);

/**
 * Without a breach segment, `base` is both the breach query and the fallback
 * presence query, so a group that stops breaching disappears from both and is
 * read as "no data" rather than "recovered" — under `keep_last` the episode
 * would never close. Only the author knows which `base` means, so make them say
 * it: split the condition into `breach`, or state the presence query.
 */
export const isAbsenceDistinguishableFromBreach = (data: RuleLifecycleShape): boolean => {
  const strategy = data.no_data?.strategy;
  if (strategy == null || strategy === noDataStrategy.ignore) return true;

  return data.no_data?.query != null || hasBreachCondition(data.query?.breach);
};

/**
 * `alert` is stored and executed, but the write APIs do not accept it yet: the
 * engine only classifies groups that already have an episode, so the strategy
 * cannot open one for a group that never breached.
 */
export const isNoDataStrategyWritable = (data: RuleLifecycleShape): boolean =>
  data.no_data?.strategy !== noDataStrategy.alert;

const rejectAlertNoDataStrategy = {
  message: 'no_data.strategy "alert" is not currently supported.',
  path: ['no_data', 'strategy'],
};

export const REQUIRE_DISTINGUISHABLE_ABSENCE_MESSAGE =
  'A no_data strategy other than "ignore" requires query.breach or no_data.query.';

const requireDistinguishableAbsence = {
  message: REQUIRE_DISTINGUISHABLE_ABSENCE_MESSAGE,
  path: ['no_data', 'query'],
};

/**
 * Recovery transition thresholds are inert under `recovery.strategy: manual`,
 * so we reject any `state_transition.recovering` block. `count: 0` is not a
 * delay — the episode recovers immediately — so it must not be configured
 * while recovery never happens.
 */
export const isRecoveryTransitionConsistentWithStrategy = (data: RuleLifecycleShape): boolean =>
  data.recovery?.strategy !== recoveryStrategy.manual || data.state_transition?.recovering == null;

/** The create-rule fields the refinements below read. */
type CreateRuleRefinementFields = Pick<
  z.infer<typeof createRuleDataBaseSchema>,
  'kind' | 'query' | 'recovery' | 'no_data' | 'state_transition'
>;

/** Builder invariants — shared between the create and update schemas. */

interface BuilderMetadataLike {
  metadata?: { builder_type?: string | null; builder_fields?: unknown };
  query?: unknown;
}

/**
 * The server generates the query from `metadata.builder_fields`, so a request
 * cannot carry both. Sending `builder_fields: null` releases the query for
 * direct edits in the same request.
 */
const isQueryAbsentForBuilderFields = (data: BuilderMetadataLike): boolean =>
  data.metadata?.builder_fields == null || data.query == null;

/** `builder_type` names the schema that validates `builder_fields`, so it is required with them. */
const isBuilderTypeProvidedForBuilderFields = (data: BuilderMetadataLike): boolean =>
  data.metadata?.builder_fields == null || Boolean(data.metadata?.builder_type);

const rejectQueryWithBuilderFields = {
  message:
    'query cannot be set together with metadata.builder_fields — the server generates the query from those fields. Send metadata.builder_fields: null in the same request to stop using the builder and set query directly.',
  path: ['query'],
};

const rejectBuilderFieldsWithoutBuilderType = {
  message: 'metadata.builder_fields requires metadata.builder_type.',
  path: ['metadata', 'builder_fields'],
};

/** A rule that is not builder-generated has to carry its own query. */
const isQueryProvidedWithoutBuilderFields = (data: BuilderMetadataLike): boolean =>
  data.metadata?.builder_fields != null || data.query != null;

/**
 * Shared create-rule cross-field refinements. Applied to both the single-create
 * body and each bulk-create item so the two write paths cannot drift.
 *
 * The remaining invariants are object-local and enforced by the discriminated
 * unions themselves; only the ones that read two different objects live here.
 */
const applyCreateRuleRefinements = <T extends z.ZodType<CreateRuleRefinementFields>>(
  schema: T
): T =>
  schema
    .refine(isStateTransitionAllowed, {
      message: 'state_transition is only allowed when kind is "alert".',
      path: ['state_transition'],
    })
    .check((ctx) => {
      const allowed = isLifecycleConfigAllowedForKind(ctx.value);
      const present = isLifecycleConfigPresentForKind(ctx.value);
      if (allowed && present) return;

      // One issue per offending field, so an alert rule that only forgot
      // `no_data` is not told to look at `recovery`.
      for (const field of LIFECYCLE_FIELDS) {
        const set = ctx.value[field] != null;
        if (!allowed && set) {
          ctx.issues.push({
            code: 'custom',
            path: [field],
            message: 'Signal rules cannot set recovery or no_data.',
            input: ctx.value[field],
          });
        }
        if (!present && !set) {
          ctx.issues.push({
            code: 'custom',
            path: [field],
            message: 'Alert rules must set both recovery and no_data.',
            input: ctx.value[field],
          });
        }
      }
    })
    .refine(isRecoveryConditionUsableWithBreach, {
      message: 'recovery.strategy "condition" requires query.breach.',
      path: ['recovery', 'segment'],
    })
    .refine(isAbsenceDistinguishableFromBreach, requireDistinguishableAbsence)
    .refine(isNoDataStrategyWritable, rejectAlertNoDataStrategy)
    .refine(isRecoveryTransitionConsistentWithStrategy, {
      message: 'state_transition.recovering has no effect when recovery.strategy is "manual".',
      path: ['state_transition', 'recovering'],
    })
    .check((ctx) => {
      const { query, recovery } = ctx.value;
      if (query == null || recovery?.strategy !== recoveryStrategy.condition) return;
      if (hasIssueOn(ctx.issues, 'query', 'recovery')) return;

      const error = validateComposedEsqlQuery(query.base, recovery.segment);
      if (error) {
        ctx.issues.push({
          code: 'custom',
          path: ['recovery', 'segment'],
          message: error,
          input: recovery.segment,
        });
      }
    })
    .refine(isQueryAbsentForBuilderFields, rejectQueryWithBuilderFields)
    .refine(isBuilderTypeProvidedForBuilderFields, rejectBuilderFieldsWithoutBuilderType)
    .refine(isQueryProvidedWithoutBuilderFields, {
      message: 'query is required unless metadata.builder_fields is set.',
      path: ['query'],
    });

// Builder-authored rules omit `query`: the server generates it from
// `metadata.builder_fields`. The refinements above keep exactly one of the two
// sources present.
export const createRuleDataSchema = applyCreateRuleRefinements(
  createRuleDataBaseSchema.extend({ query: querySchema.optional() })
).meta({
  id: 'alerting_new_rule',
});

export type CreateRuleData = z.infer<typeof createRuleDataSchema>;
export type CreateRuleDataInput = z.input<typeof createRuleDataSchema>;

// ---------------------------------------------------------------------------
// PUT (upsert replace) body schema
//
// Identical to `createRuleDataSchema` except that `metadata.builder_type`
// accepts `null` as an explicit escape hatch: the PUT caller sends null to
// confirm they want to clear a stored builder relationship and switch the rule
// to direct ES|QL editing. The replace branch of `upsertRule` normalises null
// to `undefined` before writing to storage, so null never reaches the SO and
// the response schema never advertises it.
//
// The shared `createRuleDataSchema` (POST) does not accept null because there
// is no builder relationship to clear on initial creation. The response schema
// inherits the non-nullable definition from `metadataSchema`.
//
// Ref: rule-types.md "What this design needs from the framework"
// ---------------------------------------------------------------------------

export const replaceRuleMetadataSchema = metadataSchema
  .extend({
    // Override: accept null on PUT to clear a stored builder relationship.
    builder_type: builderTypeSchema
      .optional()
      .nullable()
      .describe(
        'Identifies the rule builder that authored this rule (e.g. "threshold"). ' +
          'Absent for rules authored directly in ES|QL. ' +
          'Send null on a PUT replace to explicitly clear the builder relationship ' +
          'and switch the rule to ES|QL mode. (min length: 1, max length: 64)'
      ),
  })
  .meta({ id: 'alerting_replace_rule_metadata' });

export const replaceRuleBodySchema = createRuleDataBaseSchema
  .extend({
    query: querySchema.optional(),
    metadata: replaceRuleMetadataSchema,
  })
  .refine(isStateTransitionAllowed, {
    message: 'state_transition is only allowed when kind is "alert".',
    path: ['state_transition'],
  })
  .refine((data) => data.metadata.builder_fields != null || isSignalUsingStandaloneFormat(data), {
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
  .refine(
    (data) => data.metadata.builder_fields != null || isRecoveryQueryProvidedForStrategy(data),
    {
      message: 'query.recovery is required when recovery_strategy is "query".',
      path: ['query', 'recovery'],
    }
  )
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
  .refine(isQueryAbsentForBuilderFields, rejectQueryWithBuilderFields)
  .refine(isBuilderTypeProvidedForBuilderFields, rejectBuilderFieldsWithoutBuilderType)
  .refine(isQueryProvidedWithoutBuilderFields, {
    message: 'query is required unless metadata.builder_fields is set.',
    path: ['query'],
  })
  .meta({ id: 'alerting_replace_rule' });

export type ReplaceRuleData = z.infer<typeof replaceRuleBodySchema>;

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
        // `null` opts the rule out of builder mode, clearing both builder fields
        // and releasing `query` for direct edits in the same request.
        builder_type: builderTypeSchema
          .optional()
          .nullable()
          .describe(
            'Identifies the rule builder that authored this rule (e.g. "threshold"). ' +
              'Absent for rules authored directly in ES|QL. ' +
              'Send null to explicitly clear the builder relationship and switch the ' +
              'rule to ES|QL mode. (min length: 1, max length: 64)'
          ),
        builder_fields: builderFieldsSchema.optional().nullable(),
        // `null` clears all tags (an empty array is rejected by `.min(1)`, and
        // omitting `tags` preserves the existing ones on a partial update).
        tags: tagsSchema.min(1).nullable().optional(),
      })
      .optional(),
    time_field: z
      .string()
      .min(1)
      .max(MAX_FIELD_NAME_LENGTH)
      .optional()
      .describe(TIME_FIELD_UPDATE_DESCRIPTION),
    schedule: scheduleSchema.partial().optional().nullable(),
    query: querySchema.optional(),
    recovery: recoverySchema.optional(),
    no_data: noDataSchema.optional(),
    state_transition: stateTransitionSchema.optional().nullable(),
    grouping: groupingSchema.optional().nullable(),
    artifacts: artifactsSchema.optional().nullable(),
  })
  .strict()
  .refine(isNoDataStrategyWritable, rejectAlertNoDataStrategy)
  .check((ctx) => {
    if (!isQueryAbsentForBuilderFields(ctx.value)) {
      ctx.issues.push({
        code: 'custom',
        path: rejectQueryWithBuilderFields.path,
        message: rejectQueryWithBuilderFields.message,
        input: ctx.value.query,
      });
    }

    if (ctx.value.metadata?.builder_type === null && ctx.value.metadata?.builder_fields != null) {
      ctx.issues.push({
        code: 'custom',
        path: ['metadata', 'builder_fields'],
        message:
          'metadata.builder_fields cannot be set while metadata.builder_type is being cleared with null.',
        input: ctx.value.metadata.builder_fields,
      });
    }
  })
  .meta({ id: 'alerting_update_rule' });

export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;

/** Rule response metadata — write-path fields plus server-managed fields. */
export const ruleResponseMetadataSchema = metadataSchema
  .extend({
    /**
     * `signature_id` is optional on write (generated when absent) but the
     * framework always sets it at create time, so responses always carry it.
     */
    signature_id: z
      .string()
      .min(1)
      .max(MAX_SIGNATURE_ID_LENGTH)
      .describe(
        'Stable logical-rule identifier. Set at creation (caller-supplied or UUID v4). Immutable.'
      ),
    /**
     * Meaningful-edit counter. Incremented by at most one per write, only when
     * the write changes a field that is meaningful to the rule configuration.
     * Technical mutations (enable, disable, API-key rotation) never bump it.
     * Starts at 0 on create. Response-only: no request body may set this field.
     *
     * Ref: rule-versions.md "metadata.revision: the meaningful-edit counter"
     */
    revision: z
      .number()
      .int()
      .min(0)
      .describe(
        'Number of meaningful configuration edits. Incremented only when rule data changes, not on technical mutations like enable/disable. Starts at 0.'
      ),
    /**
     * Provenance of the rule's content. Always present in responses — the
     * framework stamps `{ type: 'internal', version: 1 }` at create time when
     * the caller omits it.
     *
     * Ref: rule-source.md "The three variants"
     */
    source: ruleSourceSchema,
    /**
     * Server-derived ownership — stamped on every create from the builder type's
     * registration for managed types, or `{ managed: false }` otherwise. Immutable
     * for the rule's life. Never accepted from a request body.
     *
     * Ref: rule-ownership.md "The ownership object"
     */
    ownership: ruleOwnershipSchema,
  })
  .meta({ id: 'alerting_rule_response_metadata' });

/**
 * Schema for rule response data returned from the API.
 * Extends the base rule schema with server-generated fields.
 */
export const ruleResponseSchema = createRuleDataBaseSchema
  .extend({
    // `null` clears the field on write; the server stores that as absent, so a
    // response never carries it.
    state_transition: stateTransitionSchema.optional(),
    /**
     * Absent on execution-compiled builder rules, which persist no query at all
     * (rule-execution-logic.md "A rule without a persisted query").
     */
    query: querySchema.optional(),
    id: z.string().describe('Unique rule identifier.'),
    version: z
      .number()
      .int()
      .min(1)
      .describe(
        'Monotonically increasing integer number representing a rule configuration version, incremented on every change. Used on generated rule events as `rule.version`.'
      ),
    enabled: z.boolean().describe('Whether the rule is enabled.'),
    created_by: actorSchema.nullable().describe('Actor who created the rule.'),
    created_at: z.iso.datetime().describe('ISO timestamp when the rule was created.'),
    updated_by: actorSchema.nullable().describe('Actor who last updated the rule.'),
    updated_at: z.iso.datetime().describe('ISO timestamp when the rule was last updated.'),
  })
  .meta({ id: 'alerting_rule_response' });

export type RuleResponse = z.infer<typeof ruleResponseSchema>;

/**
 * Sort field for find rules API.
 *
 * Phase 4 additions:
 *   - `builder_type`: sort by the builder type discriminator (keyword).
 *   - `builder_fields.risk_score`: sort by the detection risk_score sub-field
 *     (integer). The dot-separated name is the API alias; the SO path resolved
 *     by mapSortField is `metadata.builder_fields.risk_score`.
 *
 * Ref: rule-types.md "The discriminator must be indexed and filterable"
 *      rule-data-model.md "The shared detection fragment"
 */
export const findRulesSortFieldSchema = z.enum([
  'kind',
  'enabled',
  'name',
  'builder_type',
  'builder_fields.risk_score',
]);
export type FindRulesSortField = z.infer<typeof findRulesSortFieldSchema>;

/** Query parameters for the find rules (list) API. */
export const findRulesRequestSchema = z
  .object({
    page: queryIntSchema({ min: 1, max: FIND_MAX_RESULT_WINDOW })
      .optional()
      .describe(
        `The page number to return. Defaults to 1. \`page * per_page\` cannot exceed ${FIND_MAX_RESULT_WINDOW}.`
      ),
    per_page: queryIntSchema({ min: 1, max: MAX_PER_PAGE })
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
    total: z.number().describe(`The number of rules matching the query. ${ESTIMATED_COUNT_NOTE}`),
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

export const ruleIdSchema = entityIdSchema.describe(`A rule identifier. ${ENTITY_ID_NOTE}`);

/**
 * Response schema for `POST /api/alerting/v2/rules/_bulk_get`.
 */
export const bulkGetRulesResponseSchema = z
  .object({
    items: z
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
 * Successfully created rules are returned in `items`; per-item failures land
 * in `errors`. HTTP 200 even when some items fail (partial success).
 */
export const bulkCreateRulesResponseSchema = z
  .object({
    items: z
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
