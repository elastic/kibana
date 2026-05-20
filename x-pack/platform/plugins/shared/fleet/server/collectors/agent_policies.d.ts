import type { SavedObjectsClientContract } from '@kbn/core/server';
export interface AgentPoliciesUsage {
    count: number;
    output_types: string[];
    count_with_global_data_tags: number;
    count_with_non_default_space: number;
    avg_number_global_data_tags_per_policy?: number;
}
export declare const getAgentPoliciesUsage: (soClient: SavedObjectsClientContract) => Promise<AgentPoliciesUsage>;
