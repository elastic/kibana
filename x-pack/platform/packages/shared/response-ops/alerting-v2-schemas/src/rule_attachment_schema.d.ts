import type { z } from '@kbn/zod/v4';
export declare const RULE_ATTACHMENT_TYPE: "rule";
export declare const RULE_SML_TYPE: "alerting_v2_rule";
export declare const ruleAttachmentDataSchema: z.ZodObject<{
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
    version: z.ZodOptional<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    createdBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        owner: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        builder_type: z.ZodOptional<z.ZodString>;
        version: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
}, z.core.$strict>;
export type RuleAttachmentData = z.infer<typeof ruleAttachmentDataSchema>;
