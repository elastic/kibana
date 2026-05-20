export declare const findRulesOptionsSchema: import("@kbn/config-schema").ObjectType<{
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    page: import("@kbn/config-schema").Type<number | undefined>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    defaultSearchOperator: import("@kbn/config-schema").Type<"AND" | "OR" | undefined>;
    searchFields: import("@kbn/config-schema").Type<string[] | undefined>;
    sortField: import("@kbn/config-schema").Type<string | undefined>;
    sortOrder: import("@kbn/config-schema").Type<"desc" | "asc" | undefined>;
    hasReference: import("@kbn/config-schema").Type<Readonly<{} & {
        type: string;
        id: string;
    }> | Readonly<{} & {
        type: string;
        id: string;
    }>[] | undefined>;
    fields: import("@kbn/config-schema").Type<string[] | undefined>;
    filter: import("@kbn/config-schema").Type<string | Record<string, any> | undefined>;
    ruleTypeIds: import("@kbn/config-schema").Type<string[] | undefined>;
    consumers: import("@kbn/config-schema").Type<string[] | undefined>;
    searchAfter: import("@kbn/config-schema").Type<(string | number | boolean | null)[] | undefined>;
    aggs: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
}>;
export declare const findRulesParamsSchema: import("@kbn/config-schema").ObjectType<{
    options: import("@kbn/config-schema").Type<Readonly<{
        search?: string | undefined;
        filter?: string | Record<string, any> | undefined;
        fields?: string[] | undefined;
        aggs?: Record<string, any> | undefined;
        page?: number | undefined;
        searchAfter?: (string | number | boolean | null)[] | undefined;
        perPage?: number | undefined;
        sortField?: string | undefined;
        sortOrder?: "desc" | "asc" | undefined;
        searchFields?: string[] | undefined;
        hasReference?: Readonly<{} & {
            type: string;
            id: string;
        }> | Readonly<{} & {
            type: string;
            id: string;
        }>[] | undefined;
        defaultSearchOperator?: "AND" | "OR" | undefined;
        consumers?: string[] | undefined;
        ruleTypeIds?: string[] | undefined;
    } & {}> | undefined>;
    excludeFromPublicApi: import("@kbn/config-schema").Type<boolean | undefined>;
    includeSnoozeData: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
