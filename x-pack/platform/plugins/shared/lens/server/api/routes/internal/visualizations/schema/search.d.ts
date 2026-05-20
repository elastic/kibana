export declare const lensSearchRequestQuerySchema: import("@kbn/config-schema").ObjectType<{
    query: import("@kbn/config-schema").Type<string | undefined>;
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
    fields: import("@kbn/config-schema").Type<string[] | undefined>;
    searchFields: import("@kbn/config-schema").Type<string | string[] | undefined>;
}>;
export declare const lensSearchResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    data: import("@kbn/config-schema").Type<Readonly<{} & {
        data: import("@kbn/lens-embeddable-utils").LensApiConfig | Readonly<{
            description?: string | undefined;
            version?: 2 | undefined;
            state?: any;
        } & {
            title: string;
            references: Readonly<{} & {
                type: string;
                id: string;
                name: string;
            }>[];
            visualizationType: string;
        }>;
        id: string;
        meta: Readonly<{
            managed?: boolean | undefined;
            updatedAt?: string | undefined;
            createdAt?: string | undefined;
            originId?: string | undefined;
            createdBy?: string | undefined;
            updatedBy?: string | undefined;
        } & {
            type: string;
        }>;
    }>[]>;
    meta: import("@kbn/config-schema").ObjectType<{
        total: import("@kbn/config-schema").Type<number>;
        page: import("@kbn/config-schema").Type<number | undefined>;
        perPage: import("@kbn/config-schema").Type<number | undefined>;
    }>;
}>;
