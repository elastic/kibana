import type { z } from '@kbn/zod/v4';
export declare const RULE_ATTACHMENT_TYPE: 'platform.alerting.rule';
export declare const ruleAttachmentDataSchema: z.ZodObject<{
    kind: z.ZodUnion<readonly [z.ZodLiteral<"alert">, z.ZodLiteral<"signal">]>;
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
    id: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    created_at: z.ZodOptional<z.ZodISODateTime>;
    updated_at: z.ZodOptional<z.ZodISODateTime>;
    metadata: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        routing_tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
        builder: z.ZodOptional<z.ZodObject<{
            type: z.ZodString;
        }, z.core.$strict>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type RuleAttachmentData = z.infer<typeof ruleAttachmentDataSchema>;
