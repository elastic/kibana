export declare const lensCMSearchOptionsSchema: import("@kbn/config-schema").ObjectType<{
    fields: import("@kbn/config-schema").Type<string[] | undefined>;
    searchFields: import("@kbn/config-schema").Type<string | string[] | undefined>;
}>;
export declare const lensCMSearchResultSchema: import("@kbn/config-schema").ObjectType<{
    meta?: undefined;
    hits: import("@kbn/config-schema").Type<Readonly<{
        [x: string]: any;
    } & {}>[]>;
    pagination: import("@kbn/config-schema").ObjectType<{
        total: import("@kbn/config-schema").Type<number>;
        cursor: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
