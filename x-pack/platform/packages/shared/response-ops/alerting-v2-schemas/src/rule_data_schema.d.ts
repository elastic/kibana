import { z } from '@kbn/zod/v4';
/** Primitives */
export declare const esqlQuerySchema: z.ZodString;
/** Kind */
export declare const ruleKindSchema: z.ZodEnum<{
    alert: "alert";
    signal: "signal";
}>;
export type RuleKind = z.infer<typeof ruleKindSchema>;
/** Metadata (required) */
export declare const metadataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
/** Schedule (required) */
/** Duration with an additional minimum-interval guard for schedule frequency. */
export declare const scheduleEverySchema: z.ZodString;
export declare const scheduleSchema: z.ZodObject<{
    every: z.ZodString;
    lookback: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
/** Evaluation (required) */
export declare const evaluationQuerySchema: z.ZodObject<{
    base: z.ZodString;
}, z.core.$strict>;
/** Recovery policy (optional) */
export declare const recoveryPolicyTypeSchema: z.ZodEnum<{
    query: "query";
    no_breach: "no_breach";
}>;
export declare const recoveryPolicyType: {
    query: "query";
    no_breach: "no_breach";
};
export type RecoveryPolicyType = z.infer<typeof recoveryPolicyTypeSchema>;
export declare const recoveryPolicySchema: z.ZodObject<{
    type: z.ZodEnum<{
        query: "query";
        no_breach: "no_breach";
    }>;
    query: z.ZodOptional<z.ZodObject<{
        base: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
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
        alert: "alert";
        signal: "signal";
    }>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<{
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    evaluation: z.ZodObject<{
        query: z.ZodObject<{
            base: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>;
    recovery_policy: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            query: "query";
            no_breach: "no_breach";
        }>;
        query: z.ZodOptional<z.ZodObject<{
            base: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
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
    no_data: z.ZodOptional<z.ZodObject<{
        behavior: z.ZodOptional<z.ZodEnum<{
            recover: "recover";
            no_data: "no_data";
            last_status: "last_status";
        }>>;
        timeframe: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        value: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strip>;
/** Cross-field validation predicates — shared between the CRUD API and the manage_rule tool. */
export declare const isStateTransitionAllowed: (data: {
    kind?: string;
    state_transition?: unknown;
}) => boolean;
export declare const isRecoveryPolicyQueryProvided: (data: {
    recovery_policy?: {
        type?: string;
        query?: {
            base?: string;
        };
    };
}) => boolean;
export declare const createRuleDataSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        alert: "alert";
        signal: "signal";
    }>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<{
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    evaluation: z.ZodObject<{
        query: z.ZodObject<{
            base: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>;
    recovery_policy: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            query: "query";
            no_breach: "no_breach";
        }>;
        query: z.ZodOptional<z.ZodObject<{
            base: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
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
    no_data: z.ZodOptional<z.ZodObject<{
        behavior: z.ZodOptional<z.ZodEnum<{
            recover: "recover";
            no_data: "no_data";
            last_status: "last_status";
        }>>;
        timeframe: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        value: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strip>;
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
export declare const IMMUTABLE_RULE_FIELDS: readonly ["kind"];
export type ImmutableRuleField = (typeof IMMUTABLE_RULE_FIELDS)[number];
/** Update rule API schema — all fields optional for partial updates */
export declare const updateRuleDataSchema: z.ZodObject<{
    metadata: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    }, z.core.$strict>>;
    time_field: z.ZodOptional<z.ZodString>;
    schedule: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        every: z.ZodOptional<z.ZodString>;
        lookback: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, z.core.$strict>>>;
    evaluation: z.ZodOptional<z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            base: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
    recovery_policy: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            query: "query";
            no_breach: "no_breach";
        }>;
        query: z.ZodOptional<z.ZodObject<{
            base: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>>;
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
    no_data: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        behavior: z.ZodOptional<z.ZodEnum<{
            recover: "recover";
            no_data: "no_data";
            last_status: "last_status";
        }>>;
        timeframe: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>>;
    artifacts: z.ZodNullable<z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        value: z.ZodString;
    }, z.core.$strict>>>>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type UpdateRuleData = z.infer<typeof updateRuleDataSchema>;
/**
 * Schema for rule response data returned from the API.
 * Extends the base rule schema with server-generated fields.
 */
export declare const ruleResponseSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        alert: "alert";
        signal: "signal";
    }>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>;
    time_field: z.ZodDefault<z.ZodString>;
    schedule: z.ZodObject<{
        every: z.ZodString;
        lookback: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>;
    evaluation: z.ZodObject<{
        query: z.ZodObject<{
            base: z.ZodString;
        }, z.core.$strict>;
    }, z.core.$strict>;
    recovery_policy: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<{
            query: "query";
            no_breach: "no_breach";
        }>;
        query: z.ZodOptional<z.ZodObject<{
            base: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
    }, z.core.$strict>>;
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
    no_data: z.ZodOptional<z.ZodObject<{
        behavior: z.ZodOptional<z.ZodEnum<{
            recover: "recover";
            no_data: "no_data";
            last_status: "last_status";
        }>>;
        timeframe: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
    artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodString;
        value: z.ZodString;
    }, z.core.$strict>>>;
    id: z.ZodString;
    enabled: z.ZodBoolean;
    createdBy: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedBy: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export type RuleResponse = z.infer<typeof ruleResponseSchema>;
/** Sort field for find rules API. */
export declare const findRulesSortFieldSchema: z.ZodEnum<{
    name: "name";
    enabled: "enabled";
    kind: "kind";
}>;
export type FindRulesSortField = z.infer<typeof findRulesSortFieldSchema>;
/** Query parameters for the find rules (list) API. */
export declare const findRulesParamsSchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    perPage: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    filter: z.ZodOptional<z.ZodString>;
    sortField: z.ZodOptional<z.ZodEnum<{
        name: "name";
        enabled: "enabled";
        kind: "kind";
    }>>;
    sortOrder: z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FindRulesParams = z.infer<typeof findRulesParamsSchema>;
/** Paginated list response schema. */
export declare const findRulesResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            alert: "alert";
            signal: "signal";
        }>;
        metadata: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>;
        time_field: z.ZodDefault<z.ZodString>;
        schedule: z.ZodObject<{
            every: z.ZodString;
            lookback: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        evaluation: z.ZodObject<{
            query: z.ZodObject<{
                base: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>;
        recovery_policy: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                query: "query";
                no_breach: "no_breach";
            }>;
            query: z.ZodOptional<z.ZodObject<{
                base: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
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
        no_data: z.ZodOptional<z.ZodObject<{
            behavior: z.ZodOptional<z.ZodEnum<{
                recover: "recover";
                no_data: "no_data";
                last_status: "last_status";
            }>>;
            timeframe: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            value: z.ZodString;
        }, z.core.$strict>>>;
        id: z.ZodString;
        enabled: z.ZodBoolean;
        createdBy: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedBy: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    total: z.ZodNumber;
    page: z.ZodNumber;
    perPage: z.ZodNumber;
}, z.core.$strip>;
export type FindRulesResponse = z.infer<typeof findRulesResponseSchema>;
/** Rule tags response schema. */
export declare const ruleTagsResponseSchema: z.ZodObject<{
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
/** Bulk operation response schema. */
export declare const bulkOperationResponseSchema: z.ZodObject<{
    rules: z.ZodArray<z.ZodObject<{
        kind: z.ZodEnum<{
            alert: "alert";
            signal: "signal";
        }>;
        metadata: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            owner: z.ZodOptional<z.ZodString>;
            tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>;
        time_field: z.ZodDefault<z.ZodString>;
        schedule: z.ZodObject<{
            every: z.ZodString;
            lookback: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>;
        evaluation: z.ZodObject<{
            query: z.ZodObject<{
                base: z.ZodString;
            }, z.core.$strict>;
        }, z.core.$strict>;
        recovery_policy: z.ZodOptional<z.ZodObject<{
            type: z.ZodEnum<{
                query: "query";
                no_breach: "no_breach";
            }>;
            query: z.ZodOptional<z.ZodObject<{
                base: z.ZodOptional<z.ZodString>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
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
        no_data: z.ZodOptional<z.ZodObject<{
            behavior: z.ZodOptional<z.ZodEnum<{
                recover: "recover";
                no_data: "no_data";
                last_status: "last_status";
            }>>;
            timeframe: z.ZodOptional<z.ZodString>;
        }, z.core.$strict>>;
        artifacts: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodString;
            value: z.ZodString;
        }, z.core.$strict>>>;
        id: z.ZodString;
        enabled: z.ZodBoolean;
        createdBy: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        updatedBy: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
    errors: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        error: z.ZodObject<{
            message: z.ZodString;
            statusCode: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    truncated: z.ZodOptional<z.ZodBoolean>;
    totalMatched: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type BulkOperationResponse = z.infer<typeof bulkOperationResponseSchema>;
