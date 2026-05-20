export declare const GetUninstallTokensMetadataRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        policyId: import("@kbn/config-schema").Type<string | undefined>;
        search: import("@kbn/config-schema").Type<string | undefined>;
        perPage: import("@kbn/config-schema").Type<number | undefined>;
        page: import("@kbn/config-schema").Type<number | undefined>;
    }>;
};
export declare const GetUninstallTokensMetadataResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<any[]>;
    total: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
}>;
export declare const GetUninstallTokenRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        uninstallTokenId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const GetUninstallTokenResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<Omit<{
        id: import("@kbn/config-schema").Type<string>;
        policy_id: import("@kbn/config-schema").Type<string>;
        policy_name: import("@kbn/config-schema").Type<string | null | undefined>;
        created_at: import("@kbn/config-schema").Type<string>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    }, "token"> & {
        token: import("@kbn/config-schema").Type<string>;
    }>;
}>;
