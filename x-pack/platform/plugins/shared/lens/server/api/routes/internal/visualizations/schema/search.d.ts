export declare const lensSearchRequestQuerySchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").Type<string | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
    fields: import("@kbn/config-schema").Type<string[] | undefined>;
    searchFields: import("@kbn/config-schema").Type<string | string[] | undefined>;
}>;
export declare const lensSearchResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    data: import("@kbn/config-schema").Type<Readonly<{} & {
        meta: Readonly<{
            managed?: boolean | undefined;
            originId?: string | undefined;
            createdAt?: string | undefined;
            updatedAt?: string | undefined;
            createdBy?: string | undefined;
            updatedBy?: string | undefined;
        } & {
            type: string;
        }>;
        id: string;
        data: import("@kbn/lens-embeddable-utils").LensApiConfig | Readonly<{
            state?: any;
            description?: string | undefined;
            version?: 2 | undefined;
        } & {
            title: string;
            references: Readonly<{
                id: string;
                type: string;
                name: string;
            }>[];
            visualizationType: string;
        }>;
    }>[]>;
    meta: import("@kbn/config-schema").ObjectType<{
        total: import("@kbn/config-schema").Type<number>;
        page: import("@kbn/config-schema").Type<number | undefined>;
        perPage: import("@kbn/config-schema").Type<number | undefined>;
    }>;
}>;
