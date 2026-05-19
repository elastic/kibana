import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { CoreSetup } from '@kbn/core/server';
import type { FleetConfigType } from '..';
import type { AgentUsage, AgentData } from './agent_collectors';
import type { PackageUsage } from './package_collectors';
import type { FleetServerUsage } from './fleet_server_collector';
import type { AgentPanicLogsData } from './agent_logs_panics';
import type { AgentsPerOutputType } from './agents_per_output';
import type { IntegrationsDetails } from './integrations_collector';
import { type AgentOnVersionSpecificPolicy } from './version_specific_policies_collector';
export interface Usage {
    agents_enabled: boolean;
    agents: AgentUsage;
    packages: PackageUsage[];
    fleet_server: FleetServerUsage;
    agentless_agents: AgentUsage;
}
export interface FleetUsage extends Usage, AgentData {
    fleet_server_config: {
        policies: Array<{
            input_config: any;
        }>;
    };
    agent_policies: {
        count: number;
        output_types: string[];
        count_with_global_data_tags: number;
        count_with_non_default_space: number;
        count_with_agent_version_conditions: number;
    };
    agent_logs_panics_last_hour: AgentPanicLogsData['agent_logs_panics_last_hour'];
    agent_logs_top_errors?: string[];
    fleet_server_logs_top_errors?: string[];
    agents_per_output_type: AgentsPerOutputType[];
    integrations_details: IntegrationsDetails[];
    modified_ilms: string[];
    packages_with_agent_version_conditions: string[];
    agents_on_version_specific_policies_per_version: AgentOnVersionSpecificPolicy[];
    agent_upgrade_rollbacks: number;
}
export declare const fetchFleetUsage: (core: CoreSetup, config: FleetConfigType, abortController: AbortController) => Promise<FleetUsage | undefined>;
export declare const fetchAgentsUsage: (core: CoreSetup, config: FleetConfigType) => Promise<{
    agents_enabled: any;
    agents: AgentUsage;
    fleet_server: any;
    license_issued_to: string;
    deployment_id: string | undefined;
}>;
export declare function registerFleetUsageCollector(core: CoreSetup, config: FleetConfigType, usageCollection: UsageCollectionSetup | undefined): void;
