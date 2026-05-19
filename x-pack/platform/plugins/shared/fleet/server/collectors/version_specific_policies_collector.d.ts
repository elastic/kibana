import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
export interface AgentOnVersionSpecificPolicy {
    agent_version: string;
    count: number;
}
export interface VersionSpecificPoliciesUsage {
    agent_policies_count: number;
    packages_with_agent_version_conditions: string[];
    agents_on_version_specific_policies_per_version: AgentOnVersionSpecificPolicy[];
}
export declare const getVersionSpecificPoliciesUsage: (soClient: SavedObjectsClientContract, esClient: ElasticsearchClient) => Promise<VersionSpecificPoliciesUsage>;
