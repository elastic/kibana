import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicy, Output, DownloadSource, PreconfiguredAgentPolicy, PreconfiguredPackage } from '../../common/types';
import type { PreconfigurationError } from '../../common/constants';
import type { UpgradeManagedPackagePoliciesResult } from './setup/managed_package_policies';
interface PreconfigurationResult {
    policies: Array<{
        id: string;
        updated_at: string;
    }>;
    packages: string[];
    nonFatalErrors: Array<PreconfigurationError | UpgradeManagedPackagePoliciesResult>;
}
export declare function ensurePreconfiguredPackagesAndPolicies(defaultSoClient: SavedObjectsClientContract, esClient: ElasticsearchClient, policies: PreconfiguredAgentPolicy[] | undefined, packages: PreconfiguredPackage[] | undefined, defaultOutput: Output, defaultDownloadSource: DownloadSource, spaceId: string): Promise<PreconfigurationResult>;
export declare function comparePreconfiguredPolicyToCurrent(policyFromConfig: PreconfiguredAgentPolicy, currentPolicy: AgentPolicy): {
    hasChanged: boolean;
    fields: Pick<PreconfiguredAgentPolicy, "name" | "description" | "overrides" | "space_ids" | "advanced_settings" | "is_preconfigured" | "is_default" | "is_managed" | "supports_agentless" | "global_data_tags" | "is_default_fleet_server" | "has_fleet_server" | "monitoring_enabled" | "unenroll_timeout" | "inactivity_timeout" | "data_output_id" | "monitoring_output_id" | "download_source_id" | "fleet_server_host_id" | "schema_version" | "agent_features" | "is_protected" | "keep_monitoring_alive" | "agentless" | "monitoring_pprof_enabled" | "monitoring_http" | "monitoring_diagnostics" | "required_versions" | "has_agent_version_conditions" | "is_verifier">;
};
export {};
