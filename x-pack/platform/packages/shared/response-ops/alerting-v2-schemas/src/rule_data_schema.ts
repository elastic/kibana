/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { DEFAULT_TIME_FIELD } from '@kbn/alerting-v2-constants';
import { validateEsqlQuery, validateMinDuration, composeEsqlQuery } from './validation';
import { durationSchema, tagsResponseSchema, tagsSchema } from './common';
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
  MAX_BUILDER_FIELDS_KEYS,
  MAX_BUILDER_TYPE_LENGTH,
  MAX_SIGNATURE_ID_LENGTH,
} from './constants';

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

export const esqlQuerySchema = z
  .string()
  .min(1)
  .max(MAX_ESQL_QUERY_LENGTH)
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
        'Default. Tracks each problem as an alert episode and its lifecycle, link it to workflows to notify your team. Use when the user wants to detect and respond.'
      ),
    z
      .literal('signal')
      .describe(
        'Matches are stored as queryable events. No alerts, no notifications - just data. Use when the user wants to collect evidence.'
      ),
  ])
  .describe('The kind of the rule.');

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
    owner: z.string().max(256).optional().describe('Owner of the rule.'),
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
  z.literal('no_breach').describe('recovers groups that stop breaching (default).'),
  z.literal('query').describe('uses a custom recovery query to detect recovery.'),
  z.literal('none').describe('disables recovery entirely.'),
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
    .describe('Holds the last known episode status when no data is present.'),
  z
    .literal('emit')
    .describe(
      'Emits a `no_data` alert event when no_data query returns no rows for the group. "emit" is not currently accepted by the create/update API.'
    ),
  z.literal('recover').describe('Resolves the alert episode to inactive on the first no-data run.'),
  z.literal('none').describe('No-data situations are ignored (default).'),
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
  .max(MAX_ESQL_QUERY_LENGTH)
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
      const breachError = validateEsqlQuery(
        composeEsqlQuery(ctx.value.base, ctx.value.breach.segment)
      );
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
      const recoveryError = validateEsqlQuery(
        composeEsqlQuery(ctx.value.base, ctx.value.recovery.segment)
      );
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
    // Only type-agnostic structure belongs here. How large a `data` value may be
    // depends on the artifact type, which this schema deliberately does not know:
    // registered types are bounded by their own `dataSchema` (applied server-side,
    // where the artifact-type registry is available) and unregistered types pass
    // through verbatim so a disabled or rolled-back plugin cannot fail writes.
    if (Object.keys(ctx.value.data).length > MAX_ARTIFACT_DATA_FIELDS) {
      ctx.issues.push({
        code: 'custom',
        path: ['data'],
        message: `Artifact data must have at most ${MAX_ARTIFACT_DATA_FIELDS} fields.`,
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
    'Artifacts attached to the rule, each shaped as `{ id, type, data }`. `data` is a type-specific object (for example a `runbook` may carry `content`, a `dashboard` may carry `dashboard_id`). Per-type shape is validated by the artifact-type registry when the type is registered; unregistered types pass through with envelope bounds only.'
  );

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
      .default(DEFAULT_TIME_FIELD)
      .describe('Time field used for the lookback window range filter.'),
    schedule: scheduleSchema,
    query: querySchema,
    recovery_strategy: recoveryStrategySchema
      .optional()
      .describe(
        'How recovery is detected. "no_breach" recovers groups that stop breaching; "query" uses a custom recovery query; "none" disables recovery.'
      ),
    no_data_strategy: noDataStrategySchema
      .optional()
      .describe(
        'How to handle no-data situations. "last_known_status" holds the last known status; "recover" forces recovery; "none" disables no-data detection. "emit" is not currently accepted by the create/update API. Standalone-format rules must provide a `no_data` query block when this is not "none"; composed-format rules use `base` as the data-presence query.'
      ),
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

export const createRuleDataSchema = createRuleDataBaseSchema
  // Builder-authored rules omit `query`: the server generates it from
  // `metadata.builder_fields`. The refinements below keep exactly one of the two
  // sources present.
  .extend({ query: querySchema.optional() })
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
  .refine(isRecoveryTransitionConsistentWithStrategy, {
    message:
      'state_transition.recovering_count and recovering_timeframe have no effect when recovery is disabled (recovery_strategy is "none" or unset).',
    path: ['state_transition', 'recovering_count'],
  })
  .refine(isQueryAbsentForBuilderFields, rejectQueryWithBuilderFields)
  .refine(isBuilderTypeProvidedForBuilderFields, rejectBuilderFieldsWithoutBuilderType)
  .refine(isQueryProvidedWithoutBuilderFields, {
    message: 'query is required unless metadata.builder_fields is set.',
    path: ['query'],
  })
  .meta({ id: 'alerting_new_rule' });

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

const replaceRuleMetadataSchema = metadataSchema.extend({
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
});

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
        builder_type: builderTypeSchema.optional().nullable().describe(
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
    time_field: z.string().min(1).max(128).optional(),
    schedule: scheduleSchema.partial().optional().nullable(),
    query: querySchema.optional(),
    recovery_strategy: recoveryStrategySchema.optional().nullable(),
    no_data_strategy: noDataStrategySchema.optional().nullable(),
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
  });

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
    version: z
      .number()
      .int()
      .min(1)
      .describe(
        'Monotonically increasing integer number representing a rule configuration version, incremented on every change. Used on generated rule events as `rule.version`.'
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
export const findRulesRequestSchema = z.object({
  page: z.coerce.number().min(1).optional().describe('The page number to return. Defaults to 1.'),
  per_page: z.coerce
    .number()
    .min(1)
    .max(1000)
    .optional()
    .describe('The number of rules to return per page. Defaults to 20.'),
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
});

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
