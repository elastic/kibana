export declare const findRulesOptionsSchema: import("@kbn/config-schema").ObjectType<{
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    page: import("@kbn/config-schema").Type<number | undefined>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    defaultSearchOperator: import("@kbn/config-schema").Type<"AND" | "OR" | undefined>;
    searchFields: import("@kbn/config-schema").Type<string[] | undefined>;
    sortField: import("@kbn/config-schema").Type<string | undefined>;
    sortOrder: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    hasReference: import("@kbn/config-schema").Type<Readonly<{} & {
        type: string;
        id: string;
    }>[] | Readonly<{} & {
        type: string;
        id: string;
    }> | undefined>;
    fields: import("@kbn/config-schema").Type<string[] | undefined>;
    filter: import("@kbn/config-schema").Type<string | Record<string, any> | undefined>;
    ruleTypeIds: import("@kbn/config-schema").Type<string[] | undefined>;
    consumers: import("@kbn/config-schema").Type<string[] | undefined>;
    searchAfter: import("@kbn/config-schema").Type<(string | number | boolean | null)[] | undefined>;
    aggs: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
}>;
export declare const findRulesParamsSchema: import("@kbn/config-schema").ObjectType<{
    options: import("@kbn/config-schema").Type<Readonly<{
        perPage?: number | undefined;
        page?: number | undefined;
        search?: string | undefined;
        defaultSearchOperator?: "AND" | "OR" | undefined;
        searchFields?: string[] | undefined;
        sortField?: string | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        hasReference?: Readonly<{} & {
            type: string;
            id: string;
        }>[] | Readonly<{} & {
            type: string;
            id: string;
        }> | undefined;
        fields?: string[] | undefined;
        filter?: string | Record<string, any> | undefined;
        ruleTypeIds?: string[] | undefined;
        consumers?: string[] | undefined;
        searchAfter?: (string | number | boolean | null)[] | undefined;
        aggs?: Record<string, any> | undefined;
    } & {}> | undefined>;
}>;
