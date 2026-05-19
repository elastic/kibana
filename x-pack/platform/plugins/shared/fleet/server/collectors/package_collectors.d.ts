import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentUsage } from './agent_collectors';
export interface PackageUsage {
    name: string;
    version: string;
    enabled: boolean;
    agent_based?: boolean;
}
export interface AgentlessUsage {
    agentlessPackages: PackageUsage[];
    agentlessAgents: AgentUsage;
}
export declare const getPackageUsage: (soClient?: SavedObjectsClientContract) => Promise<PackageUsage[]>;
