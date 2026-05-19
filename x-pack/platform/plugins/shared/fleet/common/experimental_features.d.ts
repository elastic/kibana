/**
 * A list of allowed values that can be used in `xpack.fleet.enableExperimental` and `xpack.fleet.experimentalFeatures`.
 * This object is then used to validate and parse the value entered.
 */
export declare const allowedExperimentalValues: Readonly<Record<"showExperimentalShipperOptions" | "useSpaceAwareness" | "enableAutomaticAgentUpgrades" | "enableSyncIntegrationsOnRemote" | "enableSSLSecrets" | "installedIntegrationsTabularUI" | "enabledUpgradeAgentlessDeploymentsTask" | "enablePackageRollback" | "enableAutoInstallContentPackages" | "enableOtelIntegrations" | "enableAgentStatusAlerting" | "enableAgentPrivilegeLevelChange" | "installIntegrationsKnowledge" | "enableFleetPolicyRevisionsCleanupTask" | "enableAgentRollback" | "disableAgentlessLegacyAPI" | "enableEsqlViewInstall" | "enableSloTemplates" | "newBrowseIntegrationUx" | "enableVersionSpecificPolicies" | "enableVarGroups" | "enableIntegrationInactivityAlerting" | "enableSimplifiedAgentlessUX" | "enableOpAMP" | "enableOTelVerifier" | "enableResolveDependencies" | "enableOtelUI" | "enableIntegrationConditions", boolean>>;
export type ExperimentalFeatures = typeof allowedExperimentalValues;
type ExperimentalConfigKey = keyof ExperimentalFeatures;
/**
 * Parses two settings in kibana configuration:
 * 1. xpack.fleet.enableExperimental: an array of experimental values to enable
 * 2. xpack.fleet.experimentalFeatures: an object that associates a boolean to experimental values to enable or disable them
 *
 * The objective is to make xpack.fleet.experimentalFeatures the source of truth, while keeping
 * xpack.fleet.enableExperimental for backward compatibility.
 * In case of conflict, xpack.fleet.experimentalFeatures takes precedence over xpack.fleet.enableExperimental.
 *
 * @param enableExperimentalConfigValue the value of xpack.fleet.enableExperimental
 * @param experimentalFeaturesConfigValue the value of xpack.fleet.experimentalFeatures
 * @returns an object with experimental features and their boolean values
 */
export declare const parseExperimentalConfigValue: (enableExperimentalConfigValue: string[], experimentalFeaturesConfigValue: Partial<ExperimentalFeatures>) => ExperimentalFeatures;
/**
 * Parses and merges two config values into a single object representing experimental features.
 * Made to be generic for easier testing.
 *
 * @param enableExperimentalConfigValue an array of strings that are experimental feature values
 * @param experimentalFeaturesConfigValue an object with string keys (experimental feature names) and boolean values
 * @param existingFeatures an object with pre-existing experimental features and their default values
 * @returns an object with experimental features values updated based on the two config values provided
 */
export declare const getUpdatedExperimentalFeatures: <T extends Record<string, boolean>>(enableExperimentalConfigValue: string[], experimentalFeaturesConfigValue: {
    [k: string]: boolean;
}, existingFeatures: T) => T;
export declare const isValidExperimentalValue: (value: string) => value is ExperimentalConfigKey;
export declare const getExperimentalAllowedValues: () => string[];
export {};
