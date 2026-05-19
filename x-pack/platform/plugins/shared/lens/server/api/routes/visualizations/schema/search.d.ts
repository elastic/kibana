export declare const lensSearchRequestQuerySchema: import("@kbn/config-schema").ObjectType<{
    page: import("@kbn/config-schema").Type<number>;
    per_page: import("@kbn/config-schema").Type<number>;
    fields: import("@kbn/config-schema").Type<string[] | undefined>;
    search_fields: import("@kbn/config-schema").Type<string | string[] | undefined>;
    query: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const lensSearchResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    data: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        meta: Readonly<{
            version?: string | undefined;
            updated_at?: string | undefined;
            updated_by?: string | undefined;
            created_at?: string | undefined;
            created_by?: string | undefined;
            managed?: boolean | undefined;
            owner?: string | undefined;
        } & {}>;
        data: import("@kbn/lens-embeddable-utils").LensApiConfigNoESQL;
    }>[]>;
    meta: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number>;
        per_page: import("@kbn/config-schema").Type<number>;
        total: import("@kbn/config-schema").Type<number>;
    }>;
}>;
