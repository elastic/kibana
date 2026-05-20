export declare const lensUpdateRequestParamsSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const lensUpdateRequestBodySchema: import("@kbn/config-schema").Type<import("@kbn/lens-embeddable-utils").LensApiConfigNoESQL>;
export declare const lensUpdateResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    data: import("@kbn/config-schema").Type<import("@kbn/lens-embeddable-utils").LensApiConfigNoESQL>;
    meta: import("@kbn/config-schema").ObjectType<{
        created_at: import("@kbn/config-schema").Type<string | undefined>;
        created_by: import("@kbn/config-schema").Type<string | undefined>;
        managed: import("@kbn/config-schema").Type<boolean | undefined>;
        owner: import("@kbn/config-schema").Type<string | undefined>;
        updated_at: import("@kbn/config-schema").Type<string | undefined>;
        updated_by: import("@kbn/config-schema").Type<string | undefined>;
        version: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
