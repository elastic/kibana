import { z } from '@kbn/zod/v4';
export declare const RULE_ATTACHMENT_TYPE: "rule";
export declare const RULE_SML_TYPE: "alerting_v2_rule";
/**
 * Data stored inside a rule attachment.
 *
 * Server-generated fields (id, enabled, createdBy, createdAt, updatedBy, updatedAt)
 * are optional so that the same schema covers both:
 *   - proposed rules (by-value, not yet saved — no id or audit fields)
 *   - saved rules    (by-reference, linked via attachment.origin = rule saved object id)
 */
export declare const ruleAttachmentDataSchema: z.ZodObject<{
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
    id: z.ZodOptional<z.ZodString>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    createdBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedBy: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type RuleAttachmentData = z.infer<typeof ruleAttachmentDataSchema>;
