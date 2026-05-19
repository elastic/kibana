export declare const lensSearchRequestQuerySchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").Type<string | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
    fields: import("@kbn/config-schema").Type<string[] | undefined>;
    searchFields: import("@kbn/config-schema").Type<string | string[] | undefined>;
}>;
export declare const lensSearchResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    data: import("@kbn/config-schema").Type<Readonly<{} & {
        id: string;
        meta: Readonly<{
            originId?: string | undefined;
            managed?: boolean | undefined;
            createdBy?: string | undefined;
            updatedAt?: string | undefined;
            createdAt?: string | undefined;
            updatedBy?: string | undefined;
        } & {
            type: string;
        }>;
        data: import("@kbn/lens-embeddable-utils").LensApiConfig | Readonly<{
            state?: any;
            version?: 2 | undefined;
            description?: string | undefined;
        } & {
            title: string;
            references: Readonly<{} & {
                name: string;
                id: string;
                type: string;
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
