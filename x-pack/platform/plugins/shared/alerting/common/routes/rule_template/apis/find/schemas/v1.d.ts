export declare const findRuleTemplatesRequestQuerySchema: import("@kbn/config-schema").ObjectType<{
    per_page: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    default_search_operator: import("@kbn/config-schema").Type<"AND" | "OR" | undefined>;
    sort_field: import("@kbn/config-schema").Type<"tags" | "name" | undefined>;
    sort_order: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    rule_type_id: import("@kbn/config-schema").Type<string | undefined>;
    tags: import("@kbn/config-schema").Type<string | string[] | undefined>;
}>;
