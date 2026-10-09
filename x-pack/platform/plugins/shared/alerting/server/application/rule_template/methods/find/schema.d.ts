export declare const findRuleTemplatesParamsSchema: import("@kbn/config-schema").ObjectType<{
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    page: import("@kbn/config-schema").Type<number | undefined>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    sortField: import("@kbn/config-schema").Type<string | undefined>;
    sortOrder: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    ruleTypeId: import("@kbn/config-schema").Type<string | undefined>;
    tags: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
