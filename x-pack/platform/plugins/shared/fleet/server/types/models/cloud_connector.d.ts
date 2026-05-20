export declare const CloudConnectorSchemaV1: import("@kbn/config-schema").ObjectType<{
    packagePolicyCount: import("@kbn/config-schema").Type<number>;
    name: import("@kbn/config-schema").Type<string>;
    namespace: import("@kbn/config-schema").Type<string | undefined>;
    cloudProvider: import("@kbn/config-schema").Type<string>;
    vars: import("@kbn/config-schema").AnyType;
    created_at: import("@kbn/config-schema").Type<string>;
    updated_at: import("@kbn/config-schema").Type<string>;
}>;
export declare const CloudConnectorSchemaV2: import("@kbn/config-schema").ObjectType<{
    accountType: import("@kbn/config-schema").Type<string | undefined>;
    packagePolicyCount: import("@kbn/config-schema").Type<number>;
    name: import("@kbn/config-schema").Type<string>;
    namespace: import("@kbn/config-schema").Type<string | undefined>;
    cloudProvider: import("@kbn/config-schema").Type<string>;
    vars: import("@kbn/config-schema").AnyType;
    created_at: import("@kbn/config-schema").Type<string>;
    updated_at: import("@kbn/config-schema").Type<string>;
}>;
export declare const CloudConnectorSchemaV3: import("@kbn/config-schema").ObjectType<{
    accountType: import("@kbn/config-schema").Type<string | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    namespace: import("@kbn/config-schema").Type<string | undefined>;
    cloudProvider: import("@kbn/config-schema").Type<string>;
    vars: import("@kbn/config-schema").AnyType;
    created_at: import("@kbn/config-schema").Type<string>;
    updated_at: import("@kbn/config-schema").Type<string>;
}>;
export declare const CloudConnectorSchemaV4: import("@kbn/config-schema").ObjectType<Omit<{
    accountType: import("@kbn/config-schema").Type<string | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    namespace: import("@kbn/config-schema").Type<string | undefined>;
    cloudProvider: import("@kbn/config-schema").Type<string>;
    vars: import("@kbn/config-schema").AnyType;
    created_at: import("@kbn/config-schema").Type<string>;
    updated_at: import("@kbn/config-schema").Type<string>;
}, "verification_status" | "verification_started_at" | "verification_failed_at"> & {
    verification_status: import("@kbn/config-schema").Type<string | undefined>;
    verification_started_at: import("@kbn/config-schema").Type<string | undefined>;
    verification_failed_at: import("@kbn/config-schema").Type<string | undefined>;
}>;
