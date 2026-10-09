import { z } from '@kbn/zod/v4';
export declare const ruleTemplateDataSchema: z.ZodObject<{
    engine: z.ZodLiteral<"v2">;
    rule: z.ZodObject<{
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
}, z.core.$strict>;
export type RuleTemplateData = z.infer<typeof ruleTemplateDataSchema>;
export declare const ruleTemplateResponseSchema: z.ZodObject<{
    id: z.ZodString;
    engine: z.ZodLiteral<"v2">;
    rule: z.ZodObject<{
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
}, z.core.$strip>;
export type RuleTemplateResponse = z.infer<typeof ruleTemplateResponseSchema>;
export declare const findRuleTemplatesSortFieldSchema: z.ZodEnum<{
    name: "name";
    tags: "tags";
}>;
export type FindRuleTemplatesSortField = z.infer<typeof findRuleTemplatesSortFieldSchema>;
export declare const findRuleTemplatesRequestSchema: z.ZodObject<{
    page: z.ZodOptional<z.ZodPreprocess<z.ZodNumber>>;
    per_page: z.ZodOptional<z.ZodPreprocess<z.ZodNumber>>;
    search: z.ZodOptional<z.ZodString>;
    sort_field: z.ZodOptional<z.ZodEnum<{
        name: "name";
        tags: "tags";
    }>>;
    sort_order: z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>;
    tags: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
    excluded_tags: z.ZodOptional<z.ZodPipe<z.ZodUnion<readonly [z.ZodString, z.ZodArray<z.ZodString>]>, z.ZodTransform<string[], string | string[]>>>;
}, z.core.$strict>;
export type FindRuleTemplatesRequest = z.infer<typeof findRuleTemplatesRequestSchema>;
export declare const findRuleTemplatesResponseSchema: z.ZodObject<{
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        engine: z.ZodLiteral<"v2">;
        rule: z.ZodObject<{
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
    }, z.core.$strip>>;
    total: z.ZodNumber;
    page: z.ZodNumber;
    per_page: z.ZodNumber;
}, z.core.$strip>;
export type FindRuleTemplatesResponse = z.infer<typeof findRuleTemplatesResponseSchema>;
export declare const ruleTemplateIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strict>;
export type RuleTemplateIdParams = z.infer<typeof ruleTemplateIdParamsSchema>;
export declare const ruleTemplateTagsParamsSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type RuleTemplateTagsParams = z.infer<typeof ruleTemplateTagsParamsSchema>;
export declare const ruleTemplateTagsResponseSchema: z.ZodObject<{
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type RuleTemplateTagsResponse = z.infer<typeof ruleTemplateTagsResponseSchema>;
