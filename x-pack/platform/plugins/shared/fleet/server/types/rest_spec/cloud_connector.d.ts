export declare const CreateCloudConnectorRequestSchema: {
    body: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string>;
        cloudProvider: import("@kbn/config-schema").Type<"azure" | "aws" | "gcp">;
        accountType: import("@kbn/config-schema").Type<"single-account" | "organization-account" | undefined>;
        vars: import("@kbn/config-schema").Type<Record<string, string | number | boolean | Readonly<{
            frozen?: boolean | undefined;
        } & {
            type: string;
            value: string | Readonly<{} & {
                id: string;
                isSecretRef: boolean;
            }>;
        }>>>;
    }>;
};
export declare const CreateCloudConnectorResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        verification_status: import("@kbn/config-schema").Type<string | undefined>;
        verification_started_at: import("@kbn/config-schema").Type<string | undefined>;
        verification_failed_at: import("@kbn/config-schema").Type<string | undefined>;
        id: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string>;
        namespace: import("@kbn/config-schema").Type<string | undefined>;
        cloudProvider: import("@kbn/config-schema").Type<string>;
        accountType: import("@kbn/config-schema").Type<string | undefined>;
        vars: import("@kbn/config-schema").Type<Record<string, any>>;
        packagePolicyCount: import("@kbn/config-schema").Type<number>;
        created_at: import("@kbn/config-schema").Type<string>;
        updated_at: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export declare const GetCloudConnectorsRequestSchema: {
    query: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<string | undefined>;
        perPage: import("@kbn/config-schema").Type<string | undefined>;
        kuery: import("@kbn/config-schema").Type<string | undefined>;
    }>;
};
export declare const GetCloudConnectorsResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        namespace?: string | undefined;
        verification_status?: string | undefined;
        accountType?: string | undefined;
        verification_started_at?: string | undefined;
        verification_failed_at?: string | undefined;
    } & {
        name: string;
        id: string;
        cloudProvider: string;
        updated_at: string;
        created_at: string;
        vars: Record<string, any>;
        packagePolicyCount: number;
    }>[]>;
}>;
export declare const GetCloudConnectorRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        cloudConnectorId: import("@kbn/config-schema").Type<string>;
    }>;
};
export declare const GetCloudConnectorResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        verification_status: import("@kbn/config-schema").Type<string | undefined>;
        verification_started_at: import("@kbn/config-schema").Type<string | undefined>;
        verification_failed_at: import("@kbn/config-schema").Type<string | undefined>;
        id: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string>;
        namespace: import("@kbn/config-schema").Type<string | undefined>;
        cloudProvider: import("@kbn/config-schema").Type<string>;
        accountType: import("@kbn/config-schema").Type<string | undefined>;
        vars: import("@kbn/config-schema").Type<Record<string, any>>;
        packagePolicyCount: import("@kbn/config-schema").Type<number>;
        created_at: import("@kbn/config-schema").Type<string>;
        updated_at: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export declare const DeleteCloudConnectorRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        cloudConnectorId: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        force: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
};
export declare const DeleteCloudConnectorResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
}>;
export declare const UpdateCloudConnectorRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        cloudConnectorId: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string | undefined>;
        accountType: import("@kbn/config-schema").Type<"single-account" | "organization-account" | undefined>;
        vars: import("@kbn/config-schema").Type<Record<string, string | number | boolean | Readonly<{
            frozen?: boolean | undefined;
        } & {
            type: string;
            value: string | Readonly<{} & {
                id: string;
                isSecretRef: boolean;
            }>;
        }>> | undefined>;
    }>;
};
export declare const UpdateCloudConnectorResponseSchema: import("@kbn/config-schema").ObjectType<{
    item: import("@kbn/config-schema").ObjectType<{
        verification_status: import("@kbn/config-schema").Type<string | undefined>;
        verification_started_at: import("@kbn/config-schema").Type<string | undefined>;
        verification_failed_at: import("@kbn/config-schema").Type<string | undefined>;
        id: import("@kbn/config-schema").Type<string>;
        name: import("@kbn/config-schema").Type<string>;
        namespace: import("@kbn/config-schema").Type<string | undefined>;
        cloudProvider: import("@kbn/config-schema").Type<string>;
        accountType: import("@kbn/config-schema").Type<string | undefined>;
        vars: import("@kbn/config-schema").Type<Record<string, any>>;
        packagePolicyCount: import("@kbn/config-schema").Type<number>;
        created_at: import("@kbn/config-schema").Type<string>;
        updated_at: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export declare const GetCloudConnectorUsageRequestSchema: {
    params: import("@kbn/config-schema").ObjectType<{
        cloudConnectorId: import("@kbn/config-schema").Type<string>;
    }>;
    query: import("@kbn/config-schema").ObjectType<{
        page: import("@kbn/config-schema").Type<number | undefined>;
        perPage: import("@kbn/config-schema").Type<number | undefined>;
    }>;
};
export declare const GetCloudConnectorUsageResponseSchema: import("@kbn/config-schema").ObjectType<{
    items: import("@kbn/config-schema").Type<Readonly<{
        package?: Readonly<{} & {
            name: string;
            version: string;
            title: string;
        }> | undefined;
    } & {
        name: string;
        id: string;
        updated_at: string;
        created_at: string;
        policy_ids: string[];
    }>[]>;
    total: import("@kbn/config-schema").Type<number>;
    page: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number>;
}>;
