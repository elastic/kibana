export declare const connectorResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
    config: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    connector_type_id: import("@kbn/config-schema").Type<string>;
    is_missing_secrets: import("@kbn/config-schema").Type<boolean | undefined>;
    is_preconfigured: import("@kbn/config-schema").Type<boolean>;
    is_deprecated: import("@kbn/config-schema").Type<boolean>;
    is_system_action: import("@kbn/config-schema").Type<boolean>;
    is_connector_type_deprecated: import("@kbn/config-schema").Type<boolean>;
    auth_mode: import("@kbn/config-schema").Type<"shared" | "per-user" | undefined>;
}>;
export declare const getAllConnectorsResponseSchema: import("@kbn/config-schema").Type<Readonly<{
    config?: Record<string, any> | undefined;
    is_missing_secrets?: boolean | undefined;
    auth_mode?: "shared" | "per-user" | undefined;
} & {
    name: string;
    id: string;
    connector_type_id: string;
    is_preconfigured: boolean;
    is_deprecated: boolean;
    is_system_action: boolean;
    is_connector_type_deprecated: boolean;
    referenced_by_count: number;
}>[]>;
export declare const connectorTypeResponseSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    enabled_in_config: import("@kbn/config-schema").Type<boolean>;
    enabled_in_license: import("@kbn/config-schema").Type<boolean>;
    minimum_license_required: import("@kbn/config-schema").Type<"basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial">;
    supported_feature_ids: import("@kbn/config-schema").Type<string[]>;
    is_system_action_type: import("@kbn/config-schema").Type<boolean>;
    sub_feature: import("@kbn/config-schema").Type<"endpointSecurity" | undefined>;
    is_deprecated: import("@kbn/config-schema").Type<boolean>;
    allow_multiple_system_actions: import("@kbn/config-schema").Type<boolean | undefined>;
    source: import("@kbn/config-schema").Type<"stack" | "spec" | "yml">;
    description: import("@kbn/config-schema").Type<string | undefined>;
    is_experimental: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const getAllConnectorTypesResponseSchema: import("@kbn/config-schema").Type<Readonly<{
    description?: string | undefined;
    sub_feature?: "endpointSecurity" | undefined;
    allow_multiple_system_actions?: boolean | undefined;
    is_experimental?: boolean | undefined;
} & {
    name: string;
    id: string;
    source: "stack" | "spec" | "yml";
    enabled: boolean;
    is_deprecated: boolean;
    enabled_in_config: boolean;
    enabled_in_license: boolean;
    minimum_license_required: "basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial";
    supported_feature_ids: string[];
    is_system_action_type: boolean;
}>[]>;
export declare const connectorExecuteResponseSchema: import("@kbn/config-schema").ObjectType<{
    connector_id: import("@kbn/config-schema").Type<string>;
    status: import("@kbn/config-schema").Type<"error" | "ok">;
    message: import("@kbn/config-schema").Type<string | undefined>;
    service_message: import("@kbn/config-schema").Type<string | undefined>;
    data: import("@kbn/config-schema").Type<any>;
    retry: import("@kbn/config-schema").Type<string | boolean | null | undefined>;
    errorSource: import("@kbn/config-schema").Type<"user" | "framework" | undefined>;
    error_name: import("@kbn/config-schema").Type<string | undefined>;
    error_meta: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
}>;
export declare const connectorAuthStatusResponseSchema: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
    user_auth_status: "connected" | "not_connected" | "not_applicable";
}>>>;
export declare const getConnectorSpecResponseBodySchema: import("@kbn/config-schema").ObjectType<{
    metadata: import("@kbn/config-schema").ObjectType<{
        id: import("@kbn/config-schema").Type<string>;
        display_name: import("@kbn/config-schema").Type<string>;
        description: import("@kbn/config-schema").Type<string>;
        minimum_license: import("@kbn/config-schema").Type<string>;
        supported_feature_ids: import("@kbn/config-schema").Type<string[]>;
        icon: import("@kbn/config-schema").Type<string | undefined>;
        docs_url: import("@kbn/config-schema").Type<string | undefined>;
        is_technical_preview: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    schema: import("@kbn/config-schema").Type<Record<string, any>>;
}>;
