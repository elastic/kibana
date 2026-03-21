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
    id: string;
    name: string;
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
    minimum_license_required: import("@kbn/config-schema").Type<"gold" | "standard" | "basic" | "platinum" | "enterprise" | "trial">;
    supported_feature_ids: import("@kbn/config-schema").Type<string[]>;
    is_system_action_type: import("@kbn/config-schema").Type<boolean>;
    sub_feature: import("@kbn/config-schema").Type<"endpointSecurity" | undefined>;
    is_deprecated: import("@kbn/config-schema").Type<boolean>;
    allow_multiple_system_actions: import("@kbn/config-schema").Type<boolean | undefined>;
    source: import("@kbn/config-schema").Type<"spec" | "stack" | "yml">;
}>;
export declare const getAllConnectorTypesResponseSchema: import("@kbn/config-schema").Type<Readonly<{
    sub_feature?: "endpointSecurity" | undefined;
    allow_multiple_system_actions?: boolean | undefined;
} & {
    enabled: boolean;
    id: string;
    source: "spec" | "stack" | "yml";
    name: string;
    is_deprecated: boolean;
    enabled_in_config: boolean;
    enabled_in_license: boolean;
    minimum_license_required: "gold" | "standard" | "basic" | "platinum" | "enterprise" | "trial";
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
}>;
