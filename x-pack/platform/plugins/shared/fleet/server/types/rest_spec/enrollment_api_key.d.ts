export declare const GetEnrollmentAPIKeysRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number>;
        perPage: import("@kbn/config-schema").Type<number>;
        kuery: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export declare const GetOneEnrollmentAPIKeyRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        keyId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const EnrollmentAPIKeyResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        api_key_id: import("@kbn/config-schema").Type<string>;
        api_key: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string | undefined>;
        active: import("@kbn/config-schema").Type<boolean>;
        policy_id: import("@kbn/config-schema").Type<string | undefined>;
        created_at: import("@kbn/config-schema").Type<string>;
        hidden: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
}>;
export declare const DeleteEnrollmentAPIKeyRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        keyId: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        forceDelete: import("@kbn/config-schema").Type<boolean>;
        includeHidden: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const DeleteEnrollmentAPIKeyResponseSchema: import("@kbn/config-schema").ObjectType<{
    action: import("@kbn/config-schema").Type<"deleted">;
}>;
export declare const PostEnrollmentAPIKeyRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string | undefined>;
        policy_id: import("@kbn/config-schema").Type<string>;
        expiration: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export declare const BulkDeleteEnrollmentAPIKeysRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        tokenIds: import("@kbn/config-schema").Type<string[] | undefined>;
        kuery: import("@kbn/config-schema").Type<string | undefined>;
        forceDelete: import("@kbn/config-schema").Type<boolean>;
        includeHidden: import("@kbn/config-schema").Type<boolean>;
    }>;
};
export declare const BulkDeleteEnrollmentAPIKeysResponseSchema: import("@kbn/config-schema").ObjectType<{
    action: import("@kbn/config-schema").Type<string>;
    count: import("@kbn/config-schema").Type<number>;
    successCount: import("@kbn/config-schema").Type<number>;
    errorCount: import("@kbn/config-schema").Type<number>;
}>;
