export declare const findRulesOptionsSchema: import("@kbn/config-schema").ObjectType<{
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    page: import("@kbn/config-schema").Type<number | undefined>;
    search: import("@kbn/config-schema").Type<string | undefined>;
    defaultSearchOperator: import("@kbn/config-schema").Type<"AND" | "OR" | undefined>;
    searchFields: import("@kbn/config-schema").Type<string[] | undefined>;
    sortField: import("@kbn/config-schema").Type<string | undefined>;
    sortOrder: import("@kbn/config-schema").Type<"asc" | "desc" | undefined>;
    hasReference: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        type: string;
    }> | Readonly<{} & {
        id: string;
        type: string;
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
        page?: number | undefined;
        filter?: string | Record<string, any> | undefined;
        search?: string | undefined;
        aggs?: Record<string, any> | undefined;
        fields?: string[] | undefined;
        searchAfter?: (string | number | boolean | null)[] | undefined;
        sortField?: string | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        perPage?: number | undefined;
        searchFields?: string[] | undefined;
        hasReference?: Readonly<{} & {
            id: string;
            type: string;
        }> | Readonly<{} & {
            id: string;
            type: string;
        }>[] | undefined;
        defaultSearchOperator?: "AND" | "OR" | undefined;
        consumers?: string[] | undefined;
        ruleTypeIds?: string[] | undefined;
    } & {}> | undefined>;
}>;
