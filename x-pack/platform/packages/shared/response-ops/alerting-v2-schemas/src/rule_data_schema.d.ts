import { z } from '@kbn/zod/v4';
/** Primitives */
export declare const esqlQuerySchema: z.ZodString;
/** Kind */
export declare const ruleKindSchema: z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>;
export type RuleKind = z.infer<typeof ruleKindSchema>;
/** Metadata (required) */
export declare const metadataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    builder: z.ZodOptional<z.ZodObject<{
        type: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** Schedule (required) */
/** Duration with an additional minimum-interval guard for schedule frequency. */
export declare const scheduleEverySchema: z.ZodString;
export declare const scheduleSchema: z.ZodObject<{
    every: z.ZodString;
    lookback: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
/** Query (required) */
/**
 * Appendable ES|QL segment (e.g. `WHERE …`). Conceptually a bare command,
 * but a leading `|` is also tolerated — `composeEsqlQuery` strips it before
 * splicing the segment onto `base`. Parsed on its own rather than only as part
 * of the composed query, because the parser silently drops a command it cannot
 * read: an unparseable segment composes to bare `base`, which would store a
 * rule where every row matches.
 */
export declare const esqlQuerySegmentSchema: z.ZodString;
export declare const querySchema: z.ZodObject<{
    base: z.ZodString;
    breach: z.ZodOptional<z.ZodObject<{
        segment: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type Query = z.infer<typeof querySchema>;
/** Recovery (alert rules only) */
export declare const recoveryStrategySchema: z.ZodEnum<{
    condition: "condition";
    manual: "manual";
    no_breach: "no_breach";
    query: "query";
}>;
export declare const recoveryStrategy: {
    condition: "condition";
    manual: "manual";
    no_breach: "no_breach";
    query: "query";
};
export type RecoveryStrategy = z.infer<typeof recoveryStrategySchema>;
export declare const recoverySchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    strategy: z.ZodLiteral<"no_breach">;
}, z.core.$strict>, z.ZodObject<{
    strategy: z.ZodLiteral<"condition">;
    segment: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    strategy: z.ZodLiteral<"query">;
    query: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    strategy: z.ZodLiteral<"manual">;
}, z.core.$strict>], "strategy">;
export type Recovery = z.infer<typeof recoverySchema>;
/** No data (alert rules only) */
/**
 * No-data strategy. `alert` is a valid stored and engine value, but the create
 * and update APIs reject it (see {@link isNoDataStrategyWritable}).
 */
export declare const noDataStrategySchema: z.ZodEnum<{
    alert: "alert";
    ignore: "ignore";
    keep_last: "keep_last";
    resolve: "resolve";
}>;
export declare const noDataStrategy: {
    alert: "alert";
    ignore: "ignore";
    keep_last: "keep_last";
    resolve: "resolve";
};
export type NoDataStrategy = z.infer<typeof noDataStrategySchema>;
export declare const noDataSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    strategy: z.ZodLiteral<"ignore">;
}, z.core.$strict>, z.ZodObject<{
    strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
    query: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
    query: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
    query: z.ZodOptional<z.ZodString>;
}, z.core.$strict>], "strategy">;
export type NoData = z.infer<typeof noDataSchema>;
/**
 * True when `breach` carries a segment worth composing. Stored rules migrated
 * from the pre-collapse shape keep their legacy `breach`, which holds either a
 * blank `segment` or a full `query`; both mean "every row of `base` breaches".
 * Simplifies to a `breach != null` check once model version 7 drops the legacy
 * keys.
 */
export declare const hasBreachCondition: (breach?: {
    segment?: string;
} | null) => breach is {
    segment: string;
};
/**
 * A `query` as the ES|QL readers accept it: either the public {@link Query} or a
 * stored one still carrying the pre-collapse keys, whose `breach.segment` is
 * optional and may be blank.
 */
export interface ReadableQuery {
    base: string;
    breach?: {
        segment?: string;
    } | null;
}
/**
 * Returns the effective breach ES|QL query — what the executor actually runs
 * to detect breaches. `base` on its own when there is no breach segment to
 * append, otherwise `base` composed with `breach.segment`.
 */
export declare const getBreachEsqlQuery: (query: ReadableQuery) => string;
/**
 * Returns the recovery ES|QL query for the strategies that run one, otherwise
 * `undefined`. `no_breach` classifies absence from the breach set and `manual`
 * never recovers, so neither has a query.
 */
export declare const getRecoverEsqlQuery: (query: ReadableQuery, recovery?: Recovery) => string | undefined;
/**
 * Returns the presence ES|QL query, or `undefined` when the rule does not
 * classify absence. Without an explicit `no_data.query`, `base` is the
 * presence query.
 */
export declare const getNoDataEsqlQuery: (query: ReadableQuery, noData?: NoData) => string | undefined;
/**
 * Returns the "root" ES|QL query — the one containing the `FROM` clause and
 * therefore usable for index-pattern extraction.
 */
export declare const getRootEsqlQuery: (query: ReadableQuery) => string;
/** State transition (optional, alert-only) */
export declare const stateTransitionOperatorSchema: z.ZodEnum<{
    and: "and";
    or: "or";
}>;
export type StateTransitionOperator = z.infer<typeof stateTransitionOperatorSchema>;
export declare const stateTransitionSchema: z.ZodObject<{
    pending: z.ZodOptional<z.ZodObject<{
        count: z.ZodOptional<z.ZodNumber>;
        timeframe: z.ZodOptional<z.ZodString>;
        operator: z.ZodOptional<z.ZodEnum<{
            and: "and";
            or: "or";
        }>>;
    }, z.core.$strict>>;
    recovering: z.ZodOptional<z.ZodObject<{
        count: z.ZodOptional<z.ZodNumber>;
        timeframe: z.ZodOptional<z.ZodString>;
        operator: z.ZodOptional<z.ZodEnum<{
            and: "and";
            or: "or";
        }>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type StateTransition = z.infer<typeof stateTransitionSchema>;
/** Grouping (optional) */
export declare const groupingSchema: z.ZodObject<{
    fields: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
/**
 * Base schema without refinements - used for extending in response schema and
 * for introspection by the immutability classification meta-tests.
 * @internal
 */
export declare const createRuleDataBaseSchema: z.ZodObject<{
    kind: z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        builder: z.ZodOptional<z.ZodObject<{
            type: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<{
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    query: z.ZodObject<{
        base: z.ZodString;
        breach: z.ZodOptional<z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    recovery: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        strategy: z.ZodLiteral<"no_breach">;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"condition">;
        segment: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"query">;
        query: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"manual">;
    }, z.core.$strict>], "strategy">>;
    no_data: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        strategy: z.ZodLiteral<"ignore">;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>], "strategy">>;
    state_transition: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        pending: z.ZodOptional<z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            operator: z.ZodOptional<z.ZodEnum<{
                and: "and";
                or: "or";
            }>>;
        }, z.core.$strict>>;
        recovering: z.ZodOptional<z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            operator: z.ZodOptional<z.ZodEnum<{
                and: "and";
                or: "or";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>>;
    grouping: z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
/** Cross-field validation predicates — shared between the CRUD API and the manage_rule tool. */
/**
 * The shape the predicates below read. Deliberately structural rather than
 * `CreateRuleData`, so the stored attributes and the merged-update attributes
 * can be checked with the same functions.
 */
interface RuleLifecycleShape {
    kind?: string;
    query?: {
        breach?: {
            segment?: string;
        } | null;
    };
    recovery?: {
        strategy?: string;
    } | null;
    no_data?: {
        strategy?: string;
        query?: string;
    } | null;
    state_transition?: {
        recovering?: unknown;
    } | null;
}
export declare const isStateTransitionAllowed: (data: {
    kind?: string;
    state_transition?: unknown;
}) => boolean;
/** Signal rules never create alerts, so no action policy can be routed to them. */
export declare const isRoutingTagsAllowedForKind: (data: {
    kind?: string;
    metadata?: {
        routing_tags?: unknown;
    } | null;
}) => boolean;
export declare const ROUTING_TAGS_SIGNAL_RULE_MESSAGE = "metadata.routing_tags is only allowed when kind is \"alert\".";
/** Signal rules have no episodes, so there is nothing for recovery or no-data to transition. */
export declare const isLifecycleConfigAllowedForKind: (data: RuleLifecycleShape) => boolean;
/**
 * Alert rules spell out their whole lifecycle. The server never fills either
 * object in, so absence is a rejected write rather than a default, and no
 * reader has to interpret a missing `recovery` or `no_data`.
 */
export declare const isLifecycleConfigPresentForKind: (data: RuleLifecycleShape) => boolean;
/**
 * Without a breach segment every row of `base` breaches, so a `base + segment`
 * recovery condition can only return groups that are already breaching, and
 * breach wins. Such a rule could never auto-recover, so reject it rather than
 * store `manual` in disguise.
 */
export declare const isRecoveryConditionUsableWithBreach: (data: RuleLifecycleShape) => boolean;
/**
 * Without a breach segment, `base` is both the breach query and the fallback
 * presence query, so a group that stops breaching disappears from both and is
 * read as "no data" rather than "recovered" — under `keep_last` the episode
 * would never close. Only the author knows which `base` means, so make them say
 * it: split the condition into `breach`, or state the presence query.
 */
export declare const isAbsenceDistinguishableFromBreach: (data: RuleLifecycleShape) => boolean;
/**
 * `alert` is stored and executed, but the write APIs do not accept it yet: the
 * engine only classifies groups that already have an episode, so the strategy
 * cannot open one for a group that never breached.
 */
export declare const isNoDataStrategyWritable: (data: RuleLifecycleShape) => boolean;
export declare const REQUIRE_DISTINGUISHABLE_ABSENCE_MESSAGE = "A no_data strategy other than \"ignore\" requires query.breach or no_data.query.";
/**
 * Recovery transition thresholds are inert under `recovery.strategy: manual`,
 * so we reject any `state_transition.recovering` block. `count: 0` is not a
 * delay — the episode recovers immediately — so it must not be configured
 * while recovery never happens.
 */
export declare const isRecoveryTransitionConsistentWithStrategy: (data: RuleLifecycleShape) => boolean;
export declare const createRuleDataSchema: z.ZodObject<{
    kind: z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        builder: z.ZodOptional<z.ZodObject<{
            type: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<{
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    query: z.ZodObject<{
        base: z.ZodString;
        breach: z.ZodOptional<z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    recovery: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        strategy: z.ZodLiteral<"no_breach">;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"condition">;
        segment: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"query">;
        query: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"manual">;
    }, z.core.$strict>], "strategy">>;
    no_data: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        strategy: z.ZodLiteral<"ignore">;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>], "strategy">>;
    state_transition: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        pending: z.ZodOptional<z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            operator: z.ZodOptional<z.ZodEnum<{
                and: "and";
                or: "or";
            }>>;
        }, z.core.$strict>>;
        recovering: z.ZodOptional<z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            operator: z.ZodOptional<z.ZodEnum<{
                and: "and";
                or: "or";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>>;
    grouping: z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>>>;
}, z.core.$strict>;
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
export declare const IMMUTABLE_RULE_FIELDS: readonly ["kind"];
export type ImmutableRuleField = (typeof IMMUTABLE_RULE_FIELDS)[number];
/** Update rule API schema — all fields optional for partial updates */
export declare const updateRuleDataSchema: z.ZodObject<{
    metadata: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        builder: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            type: z.ZodString;
        }, z.core.$strict>>>;
        tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        routing_tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    }, z.core.$strict>>;
    time_field: z.ZodOptional<z.ZodString>;
    schedule: z.ZodOptional<z.ZodObject<{
        every: z.ZodOptional<z.ZodString>;
        lookback: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, z.core.$strict>>;
    query: z.ZodOptional<z.ZodObject<{
        base: z.ZodString;
        breach: z.ZodOptional<z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    recovery: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        strategy: z.ZodLiteral<"no_breach">;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"condition">;
        segment: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"query">;
        query: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"manual">;
    }, z.core.$strict>], "strategy">>;
    no_data: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        strategy: z.ZodLiteral<"ignore">;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>], "strategy">>;
    state_transition: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        pending: z.ZodOptional<z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            operator: z.ZodOptional<z.ZodEnum<{
                and: "and";
                or: "or";
            }>>;
        }, z.core.$strict>>;
        recovering: z.ZodOptional<z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            operator: z.ZodOptional<z.ZodEnum<{
                and: "and";
                or: "or";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>>;
    grouping: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>>;
    artifacts: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>>>>;
}, z.core.$strict>;
export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;
/**
 * Schema for rule response data returned from the API.
 * Extends the base rule schema with server-generated fields.
 */
export declare const ruleResponseSchema: z.ZodObject<{
    kind: z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        builder: z.ZodOptional<z.ZodObject<{
            type: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<{
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    query: z.ZodObject<{
        base: z.ZodString;
        breach: z.ZodOptional<z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    recovery: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        strategy: z.ZodLiteral<"no_breach">;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"condition">;
        segment: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"query">;
        query: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"manual">;
    }, z.core.$strict>], "strategy">>;
    no_data: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        strategy: z.ZodLiteral<"ignore">;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>], "strategy">>;
    grouping: z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>>>;
    state_transition: z.ZodOptional<z.ZodObject<{
        pending: z.ZodOptional<z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            operator: z.ZodOptional<z.ZodEnum<{
                and: "and";
                or: "or";
            }>>;
        }, z.core.$strict>>;
        recovering: z.ZodOptional<z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            operator: z.ZodOptional<z.ZodEnum<{
                and: "and";
                or: "or";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    id: z.ZodString;
    version: z.ZodNumber;
    enabled: z.ZodBoolean;
    created_by: z.ZodNullable<z.ZodObject<{
        profile_uid: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    created_at: z.ZodISODateTime;
    updated_by: z.ZodNullable<z.ZodObject<{
        profile_uid: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    updated_at: z.ZodISODateTime;
}, z.core.$strict>;
export type RuleResponse = z.infer<typeof ruleResponseSchema>;
/** Sort field for find rules API. */
export declare const findRulesSortFieldSchema: z.ZodEnum<{
    enabled: "enabled";
    kind: "kind";
    name: "name";
}>;
export type FindRulesSortField = z.infer<typeof findRulesSortFieldSchema>;
/** Query parameters for the find rules (list) API. */
export declare const findRulesRequestSchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodPreprocess<z.ZodNumber>>;
    per_page: z.ZodOptional<z.ZodPreprocess<z.ZodNumber>>;
    filter: z.ZodOptional<z.ZodString>;
    sort_field: z.ZodOptional<z.ZodEnum<{
        enabled: "enabled";
        kind: "kind";
        name: "name";
    }>>;
    sort_order: z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type FindRulesRequest = z.infer<typeof findRulesRequestSchema>;
/** Paginated list response schema. */
export declare const findRulesResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        kind: z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>;
        metadata: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            builder: z.ZodOptional<z.ZodObject<{
                type: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        time_field: z.ZodDefault<z.ZodString>;
        schedule: z.ZodObject<{
            every: z.ZodString;
            lookback: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        query: z.ZodObject<{
            base: z.ZodString;
            breach: z.ZodOptional<z.ZodObject<{
                segment: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            strategy: z.ZodLiteral<"no_breach">;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"condition">;
            segment: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"query">;
            query: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"manual">;
        }, z.core.$strict>], "strategy">>;
        no_data: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            strategy: z.ZodLiteral<"ignore">;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>], "strategy">>;
        grouping: z.ZodOptional<z.ZodObject<{
            fields: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, z.core.$strict>>>;
        state_transition: z.ZodOptional<z.ZodObject<{
            pending: z.ZodOptional<z.ZodObject<{
                count: z.ZodOptional<z.ZodNumber>;
                timeframe: z.ZodOptional<z.ZodString>;
                operator: z.ZodOptional<z.ZodEnum<{
                    and: "and";
                    or: "or";
                }>>;
            }, z.core.$strict>>;
            recovering: z.ZodOptional<z.ZodObject<{
                count: z.ZodOptional<z.ZodNumber>;
                timeframe: z.ZodOptional<z.ZodString>;
                operator: z.ZodOptional<z.ZodEnum<{
                    and: "and";
                    or: "or";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        id: z.ZodString;
        version: z.ZodNumber;
        enabled: z.ZodBoolean;
        created_by: z.ZodNullable<z.ZodObject<{
            profile_uid: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        created_at: z.ZodISODateTime;
        updated_by: z.ZodNullable<z.ZodObject<{
            profile_uid: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodISODateTime;
    }, z.core.$strict>>;
    total: z.ZodNumber;
    page: z.ZodNumber;
    per_page: z.ZodNumber;
}, z.core.$strip>;
export type FindRulesResponse = z.infer<typeof findRulesResponseSchema>;
/** Query parameters for the rule tags API. */
export declare const ruleTagsParamsSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    kind: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>>;
}, z.core.$strict>;
export type RuleTagsParams = z.infer<typeof ruleTagsParamsSchema>;
/** Rule tags response schema. */
export declare const ruleTagsResponseSchema: z.ZodObject<{
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type RuleTagsResponse = z.infer<typeof ruleTagsResponseSchema>;
/** Query parameters for the rule routing tags API. */
export declare const ruleRoutingTagsParamsSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type RuleRoutingTagsParams = z.infer<typeof ruleRoutingTagsParamsSchema>;
/** Rule routing tags response schema. */
export declare const ruleRoutingTagsResponseSchema: z.ZodObject<{
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type RuleRoutingTagsResponse = z.infer<typeof ruleRoutingTagsResponseSchema>;
export declare const ruleIdSchema: z.ZodString;
/**
 * Response schema for `POST /api/alerting/v2/rules/_bulk_get`.
 */
export declare const bulkGetRulesResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        kind: z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>;
        metadata: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            builder: z.ZodOptional<z.ZodObject<{
                type: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        time_field: z.ZodDefault<z.ZodString>;
        schedule: z.ZodObject<{
            every: z.ZodString;
            lookback: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        query: z.ZodObject<{
            base: z.ZodString;
            breach: z.ZodOptional<z.ZodObject<{
                segment: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            strategy: z.ZodLiteral<"no_breach">;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"condition">;
            segment: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"query">;
            query: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"manual">;
        }, z.core.$strict>], "strategy">>;
        no_data: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            strategy: z.ZodLiteral<"ignore">;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>], "strategy">>;
        grouping: z.ZodOptional<z.ZodObject<{
            fields: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, z.core.$strict>>>;
        state_transition: z.ZodOptional<z.ZodObject<{
            pending: z.ZodOptional<z.ZodObject<{
                count: z.ZodOptional<z.ZodNumber>;
                timeframe: z.ZodOptional<z.ZodString>;
                operator: z.ZodOptional<z.ZodEnum<{
                    and: "and";
                    or: "or";
                }>>;
            }, z.core.$strict>>;
            recovering: z.ZodOptional<z.ZodObject<{
                count: z.ZodOptional<z.ZodNumber>;
                timeframe: z.ZodOptional<z.ZodString>;
                operator: z.ZodOptional<z.ZodEnum<{
                    and: "and";
                    or: "or";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        id: z.ZodString;
        version: z.ZodNumber;
        enabled: z.ZodBoolean;
        created_by: z.ZodNullable<z.ZodObject<{
            profile_uid: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        created_at: z.ZodISODateTime;
        updated_by: z.ZodNullable<z.ZodObject<{
            profile_uid: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodISODateTime;
    }, z.core.$strict>>;
}, z.core.$strip>;
export type BulkGetRulesResponse = z.infer<typeof bulkGetRulesResponseSchema>;
/**
 * A single item in a bulk-create request: the create-rule body plus optional
 * client-supplied `id` and `enabled` (default true). Disabled rules are saved
 * and do not run until enabled.
 */
export declare const bulkCreateRuleItemSchema: z.ZodObject<{
    kind: z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        builder: z.ZodOptional<z.ZodObject<{
            type: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<{
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    query: z.ZodObject<{
        base: z.ZodString;
        breach: z.ZodOptional<z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    recovery: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        strategy: z.ZodLiteral<"no_breach">;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"condition">;
        segment: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"query">;
        query: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"manual">;
    }, z.core.$strict>], "strategy">>;
    no_data: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        strategy: z.ZodLiteral<"ignore">;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
        query: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>], "strategy">>;
    state_transition: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        pending: z.ZodOptional<z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            operator: z.ZodOptional<z.ZodEnum<{
                and: "and";
                or: "or";
            }>>;
        }, z.core.$strict>>;
        recovering: z.ZodOptional<z.ZodObject<{
            count: z.ZodOptional<z.ZodNumber>;
            timeframe: z.ZodOptional<z.ZodString>;
            operator: z.ZodOptional<z.ZodEnum<{
                and: "and";
                or: "or";
            }>>;
        }, z.core.$strict>>;
    }, z.core.$strict>>>;
    grouping: z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>>>;
    id: z.ZodOptional<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export type BulkCreateRuleItem = z.infer<typeof bulkCreateRuleItemSchema>;
/**
 * Request body schema for `POST /api/alerting/v2/rules/_bulk_create`.
 */
export declare const bulkCreateRulesRequestSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        kind: z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>;
        metadata: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            builder: z.ZodOptional<z.ZodObject<{
                type: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        time_field: z.ZodDefault<z.ZodString>;
        schedule: z.ZodObject<{
            every: z.ZodString;
            lookback: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        query: z.ZodObject<{
            base: z.ZodString;
            breach: z.ZodOptional<z.ZodObject<{
                segment: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            strategy: z.ZodLiteral<"no_breach">;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"condition">;
            segment: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"query">;
            query: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"manual">;
        }, z.core.$strict>], "strategy">>;
        no_data: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            strategy: z.ZodLiteral<"ignore">;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>], "strategy">>;
        state_transition: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            pending: z.ZodOptional<z.ZodObject<{
                count: z.ZodOptional<z.ZodNumber>;
                timeframe: z.ZodOptional<z.ZodString>;
                operator: z.ZodOptional<z.ZodEnum<{
                    and: "and";
                    or: "or";
                }>>;
            }, z.core.$strict>>;
            recovering: z.ZodOptional<z.ZodObject<{
                count: z.ZodOptional<z.ZodNumber>;
                timeframe: z.ZodOptional<z.ZodString>;
                operator: z.ZodOptional<z.ZodEnum<{
                    and: "and";
                    or: "or";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>>;
        grouping: z.ZodOptional<z.ZodObject<{
            fields: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, z.core.$strict>>>;
        id: z.ZodOptional<z.ZodString>;
        enabled: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type BulkCreateRulesParams = z.input<typeof bulkCreateRulesRequestSchema>;
/**
 * Response schema for `POST /api/alerting/v2/rules/_bulk_create`.
 * Successfully created rules are returned in `items`; per-item failures land
 * in `errors`. HTTP 200 even when some items fail (partial success).
 */
export declare const bulkCreateRulesResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        kind: z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>;
        metadata: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            builder: z.ZodOptional<z.ZodObject<{
                type: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        time_field: z.ZodDefault<z.ZodString>;
        schedule: z.ZodObject<{
            every: z.ZodString;
            lookback: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        query: z.ZodObject<{
            base: z.ZodString;
            breach: z.ZodOptional<z.ZodObject<{
                segment: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            strategy: z.ZodLiteral<"no_breach">;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"condition">;
            segment: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"query">;
            query: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"manual">;
        }, z.core.$strict>], "strategy">>;
        no_data: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
            strategy: z.ZodLiteral<"ignore">;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>, z.ZodObject<{
            strategy: z.ZodLiteral<"alert" | "keep_last" | "resolve">;
            query: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>], "strategy">>;
        grouping: z.ZodOptional<z.ZodObject<{
            fields: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, z.core.$strict>>>;
        state_transition: z.ZodOptional<z.ZodObject<{
            pending: z.ZodOptional<z.ZodObject<{
                count: z.ZodOptional<z.ZodNumber>;
                timeframe: z.ZodOptional<z.ZodString>;
                operator: z.ZodOptional<z.ZodEnum<{
                    and: "and";
                    or: "or";
                }>>;
            }, z.core.$strict>>;
            recovering: z.ZodOptional<z.ZodObject<{
                count: z.ZodOptional<z.ZodNumber>;
                timeframe: z.ZodOptional<z.ZodString>;
                operator: z.ZodOptional<z.ZodEnum<{
                    and: "and";
                    or: "or";
                }>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
        id: z.ZodString;
        version: z.ZodNumber;
        enabled: z.ZodBoolean;
        created_by: z.ZodNullable<z.ZodObject<{
            profile_uid: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        created_at: z.ZodISODateTime;
        updated_by: z.ZodNullable<z.ZodObject<{
            profile_uid: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
        updated_at: z.ZodISODateTime;
    }, z.core.$strict>>;
    errors: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        error: z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type BulkCreateRulesResponse = z.infer<typeof bulkCreateRulesResponseSchema>;
export {};
