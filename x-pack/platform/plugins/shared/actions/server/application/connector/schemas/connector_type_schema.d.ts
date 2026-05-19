export declare const connectorTypeSchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    name: import("@kbn/config-schema").Type<string>;
    enabled: import("@kbn/config-schema").Type<boolean>;
    enabledInConfig: import("@kbn/config-schema").Type<boolean>;
    enabledInLicense: import("@kbn/config-schema").Type<boolean>;
    minimumLicenseRequired: import("@kbn/config-schema").Type<"basic" | "standard" | "gold" | "platinum" | "enterprise" | "trial">;
    supportedFeatureIds: import("@kbn/config-schema").Type<string[]>;
    isSystemActionType: import("@kbn/config-schema").Type<boolean>;
    source: import("@kbn/config-schema").Type<"stack" | "spec" | "yml">;
    isDeprecated: import("@kbn/config-schema").Type<boolean>;
    subFeature: import("@kbn/config-schema").Type<"endpointSecurity" | undefined>;
    allowMultipleSystemActions: import("@kbn/config-schema").Type<boolean | undefined>;
    description: import("@kbn/config-schema").Type<string | undefined>;
    isExperimental: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
