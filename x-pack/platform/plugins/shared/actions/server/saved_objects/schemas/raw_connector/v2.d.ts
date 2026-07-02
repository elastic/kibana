export declare const rawConnectorSchema: import("@kbn/config-schema").ObjectType<Omit<{
    actionTypeId: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
    isMissingSecrets: import("@kbn/config-schema").Type<boolean>;
    config: import("@kbn/config-schema").Type<Record<string, any>>;
    secrets: import("@kbn/config-schema").Type<string>;
    isPreconfigured: import("@kbn/config-schema").Type<boolean | undefined>;
    isSystemAction: import("@kbn/config-schema").Type<boolean | undefined>;
    id: import("@kbn/config-schema").Type<string | undefined>;
    isDeprecated: import("@kbn/config-schema").Type<boolean | undefined>;
}, "authMode"> & {
    authMode: import("@kbn/config-schema").Type<"shared" | "per-user" | undefined>;
}>;
