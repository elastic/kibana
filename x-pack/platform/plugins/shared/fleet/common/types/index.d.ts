export * from './models';
export * from './rest_spec';
import type { PreconfiguredAgentPolicy, PreconfiguredPackage, PreconfiguredOutput } from './models/preconfiguration';
export interface FleetConfigType {
    enabled: boolean;
    isAirGapped?: boolean;
    registryUrl?: string;
    registryProxyUrl?: string;
    agents: {
        enabled: boolean;
        elasticsearch: {
            hosts?: string[];
            ca_sha256?: string;
            ca_trusted_fingerprint?: string;
        };
        fleet_server?: {
            hosts?: string[];
        };
    };
    agentless?: {
        enabled: boolean;
        isDefault?: boolean;
        api?: {
            url?: string;
            tls?: {
                certificate?: string;
                key?: string;
                ca?: string;
            };
        };
        deploymentSecrets?: {
            fleetAppToken?: string;
            elasticsearchAppToken?: string;
        };
        customIntegrations?: {
            enabled?: boolean;
        };
    };
    spaceSettings?: Array<{
        space_id: string;
        allowed_namespace_prefixes: string[] | null;
    }>;
    agentPolicies?: PreconfiguredAgentPolicy[];
    packages?: PreconfiguredPackage[];
    outputs?: PreconfiguredOutput[];
    agentIdVerificationEnabled?: boolean;
    eventIngestedEnabled?: boolean;
    enableExperimental?: string[];
    experimentalFeatures?: {
        [k: string]: boolean;
    };
    enableManagedLogsAndMetricsDataviews?: boolean;
    packageVerification?: {
        gpgKeyPath?: string;
    };
    setup?: {
        agentPolicySchemaUpgradeBatchSize?: number;
        uninstallTokenVerificationBatchSize?: number;
    };
    startupOptimization?: {
        deferPackageBumpInstallVersion?: boolean;
        maxConcurrentPackageOperations?: number;
        packageUpgradeBatchSize?: number;
    };
    developer?: {
        maxAgentPoliciesWithInactivityTimeout?: number;
        disableRegistryVersionCheck?: boolean;
        bundledPackageLocation?: string;
        testSecretsIndex?: string;
        disableBundledPackagesCache?: boolean;
    };
    internal?: {
        useMeteringApi?: boolean;
        disableILMPolicies: boolean;
        fleetServerStandalone: boolean;
        onlyAllowAgentUpgradeToKnownVersions: boolean;
        activeAgentsSoftLimit?: number;
        retrySetupOnBoot: boolean;
        registry: {
            kibanaVersionCheckEnabled: boolean;
            capabilities: string[];
            spec?: {
                min?: string;
                max?: string;
            };
            excludePackages: string[];
            searchAiLakePackageAllowlistEnabled?: boolean;
        };
        excludeDataStreamTypes?: string[];
    };
    createArtifactsBulkBatchSize?: number;
    autoUpgrades?: {
        taskInterval?: string;
        retryDelays?: string[];
    };
    syncIntegrations?: {
        taskInterval?: string;
    };
    autoInstallContentPackages?: {
        taskInterval?: string;
    };
    agentStatusChange?: {
        taskInterval?: string;
    };
    integrationsHomeOverride?: string;
    prereleaseEnabledByDefault?: boolean;
    hideDashboards?: boolean;
    integrationRollbackTTL?: string;
    installIntegrationsKnowledge?: boolean;
    fleetPolicyRevisionsCleanup?: {
        maxRevisions: number;
        interval: string;
        maxPoliciesPerRun: number;
    };
    versionSpecificPolicyAssignment?: {
        taskInterval?: string;
    };
    unenrollInactiveAgents?: {
        taskInterval?: string;
    };
}
export declare const entries: <T>(o: T) => Array<[keyof T, T[keyof T]]>;
/**
 * Creates a Union Type for all the values of an object
 */
export type ValueOf<T> = T[keyof T];
