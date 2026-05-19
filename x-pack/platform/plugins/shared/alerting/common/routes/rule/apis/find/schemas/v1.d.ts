export declare const findRuleParamsExamples: () => string;
export declare const findRulesRequestQuerySchema: import("@kbn/config-schema").ObjectType<{
    per_page: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    default_search_operator: import("@kbn/config-schema").Type<"AND" | "OR">;
    search_fields: import("@kbn/config-schema").Type<string | string[] | undefined>;
    sort_field: import("@kbn/config-schema").Type<string | undefined>;
    sort_order: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    has_reference: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        type: string;
    }> | null | undefined>;
    fields: import("@kbn/config-schema").Type<string | string[] | undefined>;
    filter: import("@kbn/config-schema").Type<string | undefined>;
    filter_consumers: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
export declare const findRulesInternalRequestBodySchema: import("@kbn/config-schema").ObjectType<{
    per_page: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    default_search_operator: import("@kbn/config-schema").Type<"AND" | "OR">;
    search_fields: import("@kbn/config-schema").Type<string | string[] | undefined>;
    sort_field: import("@kbn/config-schema").Type<string | undefined>;
    sort_order: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    has_reference: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        type: string;
    }> | null | undefined>;
    fields: import("@kbn/config-schema").Type<string[] | undefined>;
    filter: import("@kbn/config-schema").Type<string | undefined>;
    rule_type_ids: import("@kbn/config-schema").Type<string[] | undefined>;
    consumers: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
