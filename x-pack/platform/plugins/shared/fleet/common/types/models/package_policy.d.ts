import type { RegistryRelease, ExperimentalDataStreamFeature, DeprecationInfo } from './epm';
import type { SecretReference } from './secret';
import type { GlobalDataTag } from './agent_policy';
/** Boolean expression syntax evaluated by Elastic Agent. */
export type AgentConditionExpression = string;
export interface PackagePolicyPackage {
    name: string;
    title: string;
    version: string;
    experimental_data_stream_features?: ExperimentalDataStreamFeature[];
    requires_root?: boolean;
    type?: string;
    fips_compatible?: boolean;
}
export interface PackagePolicyConfigRecordEntry {
    type?: string;
    value?: any;
    frozen?: boolean;
}
export type PackagePolicyConfigRecord = Record<string, PackagePolicyConfigRecordEntry>;
export interface NewPackagePolicyInputStream {
    id?: string;
    enabled: boolean;
    keep_enabled?: boolean;
    data_stream: {
        dataset: string;
        type?: string;
        elasticsearch?: {
            dynamic_dataset?: boolean;
            dynamic_namespace?: boolean;
            privileges?: {
                indices?: string[];
            };
            index_mode?: string;
            source_mode?: string;
        };
    };
    release?: RegistryRelease;
    vars?: PackagePolicyConfigRecord;
    var_group_selections?: Record<string, string>;
    config?: PackagePolicyConfigRecord;
    condition?: AgentConditionExpression;
    migrate_from?: string;
}
export interface PackagePolicyInputStream extends NewPackagePolicyInputStream {
    id: string;
    compiled_stream?: any;
}
export interface NewPackagePolicyInput {
    /** Auto-generated instance identifier for this input within a saved package policy (e.g. `otelcol-nginx-abc123`). Distinct from `name`, which comes from the registry manifest and is used to disambiguate inputs of the same type. */
    id?: string;
    /** The registry input's `name` field, when set. Used to disambiguate multiple inputs of the same `type` within a policy template. Falls back to `type` when absent. */
    name?: string;
    type: string;
    policy_template?: string;
    enabled: boolean;
    keep_enabled?: boolean;
    vars?: PackagePolicyConfigRecord;
    var_group_selections?: Record<string, string>;
    config?: PackagePolicyConfigRecord;
    streams: NewPackagePolicyInputStream[];
    condition?: AgentConditionExpression;
    deprecated?: DeprecationInfo;
    migrate_from?: string;
}
export interface PackagePolicyInput extends Omit<NewPackagePolicyInput, 'streams'> {
    streams: PackagePolicyInputStream[];
    compiled_input?: any;
}
export interface NewPackagePolicy {
    id?: string | number;
    name: string;
    description?: string;
    namespace?: string;
    enabled: boolean;
    is_managed?: boolean;
    /** @deprecated Nullable to allow user to clear existing policy id */
    policy_id?: string | null;
    policy_ids: string[];
    output_id?: string | null;
    cloud_connector_id?: string | null;
    cloud_connector_name?: string | null;
    package?: PackagePolicyPackage;
    inputs: NewPackagePolicyInput[];
    vars?: PackagePolicyConfigRecord;
    var_group_selections?: Record<string, string>;
    elasticsearch?: {
        privileges?: {
            cluster?: string[];
        };
        [key: string]: any;
    };
    overrides?: {
        inputs?: {
            [key: string]: any;
        };
    } | null;
    supports_agentless?: boolean | null;
    supports_cloud_connector?: boolean | null;
    additional_datastreams_permissions?: string[];
    global_data_tags?: GlobalDataTag[];
    condition?: AgentConditionExpression;
}
export interface UpdatePackagePolicy extends NewPackagePolicy {
    version?: string;
}
export interface PackagePolicy extends Omit<NewPackagePolicy, 'inputs'> {
    id: string;
    spaceIds?: string[];
    inputs: PackagePolicyInput[];
    version?: string;
    agents?: number;
    revision: number;
    secret_references?: SecretReference[];
    updated_at: string;
    updated_by: string;
    created_at: string;
    created_by: string;
    package_agent_version_condition?: string;
}
export type DryRunPackagePolicy = NewPackagePolicy & {
    errors?: Array<{
        key: string | undefined;
        message: string;
    }>;
    missingVars?: string[];
};
