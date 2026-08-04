import { z } from '@kbn/zod/v4';
/** Primitives */
export declare const esqlQuerySchema: z.ZodString;
/** Kind */
export declare const ruleKindSchema: z.ZodEnum<{
    signal: "signal";
    alert: "alert";
}>;
export type RuleKind = z.infer<typeof ruleKindSchema>;
/** Metadata (required) */
export declare const metadataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    builder_type: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
/** Schedule (required) */
/** Duration with an additional minimum-interval guard for schedule frequency. */
export declare const scheduleEverySchema: z.ZodString;
export declare const scheduleSchema: z.ZodObject<{
    every: z.ZodString;
    lookback: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
/** Query (required) */
export declare const queryFormatSchema: z.ZodEnum<{
    standalone: "standalone";
    composed: "composed";
}>;
export declare const queryFormat: {
    standalone: "standalone";
    composed: "composed";
};
export type QueryFormat = z.infer<typeof queryFormatSchema>;
/** Recovery strategy. */
export declare const recoveryStrategySchema: z.ZodEnum<{
    query: "query";
    none: "none";
    no_breach: "no_breach";
}>;
export declare const recoveryStrategy: {
    query: "query";
    none: "none";
    no_breach: "no_breach";
};
export type RecoveryStrategy = z.infer<typeof recoveryStrategySchema>;
/**
 * No-data strategy.
 *
 * Note: `'emit'` is a valid stored/engine value but is temporarily rejected as
 * write-API input (create/update).
 */
export declare const noDataStrategySchema: z.ZodEnum<{
    none: "none";
    emit: "emit";
    recover: "recover";
    last_known_status: "last_known_status";
}>;
export declare const noDataStrategy: {
    none: "none";
    emit: "emit";
    recover: "recover";
    last_known_status: "last_known_status";
};
export type NoDataStrategy = z.infer<typeof noDataStrategySchema>;
/**
 * Appendable ES|QL segment (e.g. `WHERE …`). Conceptually a bare command,
 * but a leading `|` is also tolerated — `composeEsqlQuery` strips it before
 * splicing the segment onto `base`. We only enforce structural bounds here
 * (length, non-empty). Full parser validation only runs when the segment is
 * composed with its `base` via `composeEsqlQuery`.
 */
export declare const esqlQuerySegmentSchema: z.ZodString;
export declare const composedQuerySchema: z.ZodObject<{
    format: z.ZodLiteral<"composed">;
    base: z.ZodString;
    breach: z.ZodObject<{
        segment: z.ZodString;
    }, z.core.$strict>;
    recovery: z.ZodOptional<z.ZodObject<{
        segment: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const standaloneQuerySchema: z.ZodObject<{
    format: z.ZodLiteral<"standalone">;
    breach: z.ZodObject<{
        query: z.ZodString;
    }, z.core.$strict>;
    recovery: z.ZodOptional<z.ZodObject<{
        query: z.ZodString;
    }, z.core.$strict>>;
    no_data: z.ZodOptional<z.ZodObject<{
        query: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const querySchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    format: z.ZodLiteral<"composed">;
    base: z.ZodString;
    breach: z.ZodObject<{
        segment: z.ZodString;
    }, z.core.$strict>;
    recovery: z.ZodOptional<z.ZodObject<{
        segment: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    format: z.ZodLiteral<"standalone">;
    breach: z.ZodObject<{
        query: z.ZodString;
    }, z.core.$strict>;
    recovery: z.ZodOptional<z.ZodObject<{
        query: z.ZodString;
    }, z.core.$strict>>;
    no_data: z.ZodOptional<z.ZodObject<{
        query: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>], "format">;
export type Query = z.infer<typeof querySchema>;
/**
 * Returns the effective breach ES|QL query — what the executor actually runs
 * to detect breaches. For composed queries this is `base` concatenated with
 * `breach.segment`; for standalone it's `breach.query` verbatim.
 */
export declare const getBreachEsqlQuery: (query: Query) => string;
/**
 * Returns the recovery ES|QL query when `recoveryStrategy` is `'query'`,
 * otherwise `undefined`. For composed queries this is `base` +
 * `recovery.segment`; for standalone it's `recovery.query` verbatim.
 */
export declare const getRecoverEsqlQuery: (query: Query, strategy?: RecoveryStrategy) => string | undefined;
/**
 * Returns the has-data ES|QL query when `noDataStrategy` is not `'none'`,
 * otherwise `undefined`.
 *
 * - Standalone: returns the explicit `no_data.query` block, if configured.
 * - Composed: returns the `base` query.
 */
export declare const getNoDataEsqlQuery: (query: Query, strategy?: NoDataStrategy) => string | undefined;
/**
 * Returns the "root" ES|QL query — the one containing the `FROM` clause and
 * therefore usable for index-pattern extraction. `base` for composed,
 * `breach.query` for standalone.
 */
export declare const getRootEsqlQuery: (query: Query) => string;
/** State transition (optional, alert-only) */
export declare const stateTransitionOperatorSchema: z.ZodEnum<{
    AND: "AND";
    OR: "OR";
}>;
export declare const stateTransitionSchema: z.ZodNullable<z.ZodOptional<z.ZodObject<{
    pending_operator: z.ZodOptional<z.ZodEnum<{
        AND: "AND";
        OR: "OR";
    }>>;
    pending_count: z.ZodOptional<z.ZodNumber>;
    pending_timeframe: z.ZodOptional<z.ZodString>;
    recovering_operator: z.ZodOptional<z.ZodEnum<{
        AND: "AND";
        OR: "OR";
    }>>;
    recovering_count: z.ZodOptional<z.ZodNumber>;
    recovering_timeframe: z.ZodOptional<z.ZodString>;
}, z.core.$strict>>>;
/** Grouping (optional) */
export declare const groupingSchema: z.ZodObject<{
    fields: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
/** Create rule API schema */
/**
 * Base schema without refinements - used for extending in response schema and
 * for introspection by the immutability classification meta-tests.
 * @internal
 */
export declare const createRuleDataBaseSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        signal: "signal";
        alert: "alert";
    }>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        builder_type: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<{
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    query: z.ZodDiscriminatedUnion<[z.ZodObject<{
        format: z.ZodLiteral<"composed">;
        base: z.ZodString;
        breach: z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        format: z.ZodLiteral<"standalone">;
        breach: z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>>;
        no_data: z.ZodOptional<z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>], "format">;
    recovery_strategy: z.ZodOptional<z.ZodEnum<{
        query: "query";
        none: "none";
        no_breach: "no_breach";
    }>>;
    no_data_strategy: z.ZodOptional<z.ZodEnum<{
        none: "none";
        emit: "emit";
        recover: "recover";
        last_known_status: "last_known_status";
    }>>;
    state_transition: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        pending_operator: z.ZodOptional<z.ZodEnum<{
            AND: "AND";
            OR: "OR";
        }>>;
        pending_count: z.ZodOptional<z.ZodNumber>;
        pending_timeframe: z.ZodOptional<z.ZodString>;
        recovering_operator: z.ZodOptional<z.ZodEnum<{
            AND: "AND";
            OR: "OR";
        }>>;
        recovering_count: z.ZodOptional<z.ZodNumber>;
        recovering_timeframe: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    grouping: z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        value: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strict>;
/** Cross-field validation predicates — shared between the CRUD API and the manage_rule tool. */
export declare const isStateTransitionAllowed: (data: {
    kind?: string;
    state_transition?: unknown;
}) => boolean;
export declare const isSignalUsingStandaloneFormat: (data: {
    kind?: string;
    query?: {
        format?: string;
    };
}) => boolean;
/** Signal rules only run a breach query — no recovery or no-data behaviour. */
export declare const isSignalQueryBreachOnly: (data: {
    kind?: string;
    recovery_strategy?: RecoveryStrategy | null;
    no_data_strategy?: NoDataStrategy | null;
}) => boolean;
/** query.recovery is only meaningful when recovery_strategy is "query". */
export declare const isRecoveryQueryConsistentWithStrategy: (data: {
    recovery_strategy?: RecoveryStrategy | null;
    query?: {
        recovery?: unknown;
    };
}) => boolean;
/** recovery_strategy "query" requires a recovery query block. */
export declare const isRecoveryQueryProvidedForStrategy: (data: {
    recovery_strategy?: RecoveryStrategy | null;
    query?: {
        recovery?: unknown;
    };
}) => boolean;
/** query.no_data is only meaningful when no_data_strategy is not "none". */
type QueryWithOptionalNoData = Record<string, unknown>;
export declare const isNoDataQueryConsistentWithStrategy: (data: {
    no_data_strategy?: NoDataStrategy | null;
    query?: QueryWithOptionalNoData;
}) => boolean;
/**
 * Standalone rules with `no_data_strategy != 'none'` must provide a
 * `query.no_data` block. Composed rules use their `base` query as the
 * data-presence query, so they don't need a separate block.
 */
export declare const isNoDataQueryProvidedForStrategy: (data: {
    no_data_strategy?: NoDataStrategy | null;
    query?: QueryWithOptionalNoData;
}) => boolean;
/** `no_data_strategy: 'emit'` is temporarily not accepted (see `noDataStrategySchema`). */
export declare const isNoDataStrategyNotEmit: (data: {
    no_data_strategy?: NoDataStrategy | null;
}) => boolean;
export declare const createRuleDataSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        signal: "signal";
        alert: "alert";
    }>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        builder_type: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<{
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    query: z.ZodDiscriminatedUnion<[z.ZodObject<{
        format: z.ZodLiteral<"composed">;
        base: z.ZodString;
        breach: z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        format: z.ZodLiteral<"standalone">;
        breach: z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>>;
        no_data: z.ZodOptional<z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>], "format">;
    recovery_strategy: z.ZodOptional<z.ZodEnum<{
        query: "query";
        none: "none";
        no_breach: "no_breach";
    }>>;
    no_data_strategy: z.ZodOptional<z.ZodEnum<{
        none: "none";
        emit: "emit";
        recover: "recover";
        last_known_status: "last_known_status";
    }>>;
    state_transition: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        pending_operator: z.ZodOptional<z.ZodEnum<{
            AND: "AND";
            OR: "OR";
        }>>;
        pending_count: z.ZodOptional<z.ZodNumber>;
        pending_timeframe: z.ZodOptional<z.ZodString>;
        recovering_operator: z.ZodOptional<z.ZodEnum<{
            AND: "AND";
            OR: "OR";
        }>>;
        recovering_count: z.ZodOptional<z.ZodNumber>;
        recovering_timeframe: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    grouping: z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        value: z.ZodString;
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
        owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        builder_type: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strict>>;
    time_field: z.ZodOptional<z.ZodString>;
    schedule: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        every: z.ZodOptional<z.ZodString>;
        lookback: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, z.core.$strict>>>;
    query: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        format: z.ZodLiteral<"composed">;
        base: z.ZodString;
        breach: z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        format: z.ZodLiteral<"standalone">;
        breach: z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>>;
        no_data: z.ZodOptional<z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>], "format">>;
    recovery_strategy: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        query: "query";
        none: "none";
        no_breach: "no_breach";
    }>>>;
    no_data_strategy: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        none: "none";
        emit: "emit";
        recover: "recover";
        last_known_status: "last_known_status";
    }>>>;
    state_transition: z.ZodNullable<z.ZodNullable<z.ZodOptional<z.ZodObject<{
        pending_operator: z.ZodOptional<z.ZodEnum<{
            AND: "AND";
            OR: "OR";
        }>>;
        pending_count: z.ZodOptional<z.ZodNumber>;
        pending_timeframe: z.ZodOptional<z.ZodString>;
        recovering_operator: z.ZodOptional<z.ZodEnum<{
            AND: "AND";
            OR: "OR";
        }>>;
        recovering_count: z.ZodOptional<z.ZodNumber>;
        recovering_timeframe: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>>;
    grouping: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>>;
    artifacts: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        value: z.ZodString;
    }, z.core.$strict>>>>;
}, z.core.$strict>;
export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;
/** Update rule API body schema — adds OCC version on top of update data. */
export declare const updateRuleBodySchema: z.ZodObject<{
    metadata: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        builder_type: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strict>>;
    time_field: z.ZodOptional<z.ZodString>;
    schedule: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        every: z.ZodOptional<z.ZodString>;
        lookback: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, z.core.$strict>>>;
    query: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        format: z.ZodLiteral<"composed">;
        base: z.ZodString;
        breach: z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        format: z.ZodLiteral<"standalone">;
        breach: z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>>;
        no_data: z.ZodOptional<z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>], "format">>;
    recovery_strategy: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        query: "query";
        none: "none";
        no_breach: "no_breach";
    }>>>;
    no_data_strategy: z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        none: "none";
        emit: "emit";
        recover: "recover";
        last_known_status: "last_known_status";
    }>>>;
    state_transition: z.ZodNullable<z.ZodNullable<z.ZodOptional<z.ZodObject<{
        pending_operator: z.ZodOptional<z.ZodEnum<{
            AND: "AND";
            OR: "OR";
        }>>;
        pending_count: z.ZodOptional<z.ZodNumber>;
        pending_timeframe: z.ZodOptional<z.ZodString>;
        recovering_operator: z.ZodOptional<z.ZodEnum<{
            AND: "AND";
            OR: "OR";
        }>>;
        recovering_count: z.ZodOptional<z.ZodNumber>;
        recovering_timeframe: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>>;
    grouping: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>>;
    artifacts: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        value: z.ZodString;
    }, z.core.$strict>>>>;
    version: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type UpdateRuleBody = z.infer<typeof updateRuleBodySchema>;
/**
 * Schema for rule response data returned from the API.
 * Extends the base rule schema with server-generated fields.
 */
export declare const ruleResponseSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        signal: "signal";
        alert: "alert";
    }>;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<{
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    query: z.ZodDiscriminatedUnion<[z.ZodObject<{
        format: z.ZodLiteral<"composed">;
        base: z.ZodString;
        breach: z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodObject<{
            segment: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        format: z.ZodLiteral<"standalone">;
        breach: z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>;
        recovery: z.ZodOptional<z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>>;
        no_data: z.ZodOptional<z.ZodObject<{
            query: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strict>], "format">;
    recovery_strategy: z.ZodOptional<z.ZodEnum<{
        query: "query";
        none: "none";
        no_breach: "no_breach";
    }>>;
    no_data_strategy: z.ZodOptional<z.ZodEnum<{
        none: "none";
        emit: "emit";
        recover: "recover";
        last_known_status: "last_known_status";
    }>>;
    state_transition: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        pending_operator: z.ZodOptional<z.ZodEnum<{
            AND: "AND";
            OR: "OR";
        }>>;
        pending_count: z.ZodOptional<z.ZodNumber>;
        pending_timeframe: z.ZodOptional<z.ZodString>;
        recovering_operator: z.ZodOptional<z.ZodEnum<{
            AND: "AND";
            OR: "OR";
        }>>;
        recovering_count: z.ZodOptional<z.ZodNumber>;
        recovering_timeframe: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    grouping: z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        value: z.ZodString;
    }, z.core.$strict>>>;
    id: z.ZodString;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        builder_type: z.ZodOptional<z.ZodString>;
        version: z.ZodNumber;
    }, z.core.$strict>;
    enabled: z.ZodBoolean;
    createdBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedBy: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type RuleResponse = z.infer<typeof ruleResponseSchema>;
/** Sort field for find rules API. */
export declare const findRulesSortFieldSchema: z.ZodEnum<{
    enabled: "enabled";
    name: "name";
    kind: "kind";
}>;
export type FindRulesSortField = z.infer<typeof findRulesSortFieldSchema>;
/** Query parameters for the find rules (list) API. */
export declare const findRulesRequestSchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    per_page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    filter: z.ZodOptional<z.ZodString>;
    sort_field: z.ZodOptional<z.ZodEnum<{
        enabled: "enabled";
        name: "name";
        kind: "kind";
    }>>;
    sort_order: z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FindRulesRequest = z.infer<typeof findRulesRequestSchema>;
/** Paginated list response schema. */
export declare const findRulesResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            signal: "signal";
            alert: "alert";
        }>;
        time_field: z.ZodDefault<z.ZodString>;
        schedule: z.ZodObject<{
            every: z.ZodString;
            lookback: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        query: z.ZodDiscriminatedUnion<[z.ZodObject<{
            format: z.ZodLiteral<"composed">;
            base: z.ZodString;
            breach: z.ZodObject<{
                segment: z.ZodString;
            }, z.core.$strict>;
            recovery: z.ZodOptional<z.ZodObject<{
                segment: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>, z.ZodObject<{
            format: z.ZodLiteral<"standalone">;
            breach: z.ZodObject<{
                query: z.ZodString;
            }, z.core.$strict>;
            recovery: z.ZodOptional<z.ZodObject<{
                query: z.ZodString;
            }, z.core.$strict>>;
            no_data: z.ZodOptional<z.ZodObject<{
                query: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>], "format">;
        recovery_strategy: z.ZodOptional<z.ZodEnum<{
            query: "query";
            none: "none";
            no_breach: "no_breach";
        }>>;
        no_data_strategy: z.ZodOptional<z.ZodEnum<{
            none: "none";
            emit: "emit";
            recover: "recover";
            last_known_status: "last_known_status";
        }>>;
        state_transition: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            pending_operator: z.ZodOptional<z.ZodEnum<{
                AND: "AND";
                OR: "OR";
            }>>;
            pending_count: z.ZodOptional<z.ZodNumber>;
            pending_timeframe: z.ZodOptional<z.ZodString>;
            recovering_operator: z.ZodOptional<z.ZodEnum<{
                AND: "AND";
                OR: "OR";
            }>>;
            recovering_count: z.ZodOptional<z.ZodNumber>;
            recovering_timeframe: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        grouping: z.ZodOptional<z.ZodObject<{
            fields: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            value: z.ZodString;
        }, z.core.$strict>>>;
        id: z.ZodString;
        metadata: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            builder_type: z.ZodOptional<z.ZodString>;
            version: z.ZodNumber;
        }, z.core.$strict>;
        enabled: z.ZodBoolean;
        createdBy: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedBy: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    total: z.ZodNumber;
    page: z.ZodNumber;
    perPage: z.ZodNumber;
}, z.core.$strip>;
export type FindRulesResponse = z.infer<typeof findRulesResponseSchema>;
/** Query parameters for the rule tags API. */
export declare const ruleTagsParamsSchema: z.ZodObject<{
    filter: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type RuleTagsParams = z.infer<typeof ruleTagsParamsSchema>;
/** Rule tags response schema. */
export declare const ruleTagsResponseSchema: z.ZodObject<{
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type RuleTagsResponse = z.infer<typeof ruleTagsResponseSchema>;
export declare const ruleIdSchema: z.ZodString;
/**
 * Request body schema for `POST /api/alerting/v2/rules/_bulk_get`.
 */
export declare const bulkGetRulesParamsSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export type BulkGetRulesParams = z.infer<typeof bulkGetRulesParamsSchema>;
/**
 * Response schema for `POST /api/alerting/v2/rules/_bulk_get`.
 */
export declare const bulkGetRulesResponseSchema: z.ZodObject<{
    rules: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            signal: "signal";
            alert: "alert";
        }>;
        time_field: z.ZodDefault<z.ZodString>;
        schedule: z.ZodObject<{
            every: z.ZodString;
            lookback: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        query: z.ZodDiscriminatedUnion<[z.ZodObject<{
            format: z.ZodLiteral<"composed">;
            base: z.ZodString;
            breach: z.ZodObject<{
                segment: z.ZodString;
            }, z.core.$strict>;
            recovery: z.ZodOptional<z.ZodObject<{
                segment: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>, z.ZodObject<{
            format: z.ZodLiteral<"standalone">;
            breach: z.ZodObject<{
                query: z.ZodString;
            }, z.core.$strict>;
            recovery: z.ZodOptional<z.ZodObject<{
                query: z.ZodString;
            }, z.core.$strict>>;
            no_data: z.ZodOptional<z.ZodObject<{
                query: z.ZodString;
            }, z.core.$strict>>;
        }, z.core.$strict>], "format">;
        recovery_strategy: z.ZodOptional<z.ZodEnum<{
            query: "query";
            none: "none";
            no_breach: "no_breach";
        }>>;
        no_data_strategy: z.ZodOptional<z.ZodEnum<{
            none: "none";
            emit: "emit";
            recover: "recover";
            last_known_status: "last_known_status";
        }>>;
        state_transition: z.ZodNullable<z.ZodOptional<z.ZodObject<{
            pending_operator: z.ZodOptional<z.ZodEnum<{
                AND: "AND";
                OR: "OR";
            }>>;
            pending_count: z.ZodOptional<z.ZodNumber>;
            pending_timeframe: z.ZodOptional<z.ZodString>;
            recovering_operator: z.ZodOptional<z.ZodEnum<{
                AND: "AND";
                OR: "OR";
            }>>;
            recovering_count: z.ZodOptional<z.ZodNumber>;
            recovering_timeframe: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>>;
        grouping: z.ZodOptional<z.ZodObject<{
            fields: z.ZodArray<z.ZodString>;
        }, z.core.$strict>>;
        artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            value: z.ZodString;
        }, z.core.$strict>>>;
        id: z.ZodString;
        metadata: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            builder_type: z.ZodOptional<z.ZodString>;
            version: z.ZodNumber;
        }, z.core.$strict>;
        enabled: z.ZodBoolean;
        createdBy: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedBy: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodString;
        version: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strip>;
export type BulkGetRulesResponse = z.infer<typeof bulkGetRulesResponseSchema>;
export {};
