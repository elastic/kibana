export declare const connectorSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
    actionTypeId: import("@kbn/config-schema").Type<string>;
    config: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    isMissingSecrets: import("@kbn/config-schema").Type<boolean | undefined>;
    isPreconfigured: import("@kbn/config-schema").Type<boolean>;
    isDeprecated: import("@kbn/config-schema").Type<boolean>;
    isSystemAction: import("@kbn/config-schema").Type<boolean>;
    isConnectorTypeDeprecated: import("@kbn/config-schema").Type<boolean>;
    authMode: import("@kbn/config-schema").Type<"shared" | "per-user" | undefined>;
}>;
export declare const connectorWithExtraFindDataSchema: import("@kbn/config-schema").ObjectType<Omit<{
    id: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
    actionTypeId: import("@kbn/config-schema").Type<string>;
    config: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    isMissingSecrets: import("@kbn/config-schema").Type<boolean | undefined>;
    isPreconfigured: import("@kbn/config-schema").Type<boolean>;
    isDeprecated: import("@kbn/config-schema").Type<boolean>;
    isSystemAction: import("@kbn/config-schema").Type<boolean>;
    isConnectorTypeDeprecated: import("@kbn/config-schema").Type<boolean>;
    authMode: import("@kbn/config-schema").Type<"shared" | "per-user" | undefined>;
}, "referencedByCount"> & {
    referencedByCount: import("@kbn/config-schema").Type<number>;
}>;
