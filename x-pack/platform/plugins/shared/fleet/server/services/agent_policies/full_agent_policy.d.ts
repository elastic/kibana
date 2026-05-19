import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { FullAgentPolicy, Output, FullAgentPolicyOutput, FleetProxy, FleetServerHost, AgentPolicy } from '../../types';
import type { DownloadSource, FullAgentPolicyDownload, FullAgentPolicyMonitoring } from '../../../common/types';
export declare function getFullAgentPolicy(soClient: SavedObjectsClientContract, id: string, options?: {
    standalone?: boolean;
    agentPolicy?: AgentPolicy;
    agentVersion?: string;
}): Promise<FullAgentPolicy | null>;
export declare function generateFleetConfig(fleetServerHost: FleetServerHost, proxies: FleetProxy[]): FullAgentPolicy['fleet'];
export declare function transformOutputToFullPolicyOutput(output: Output, proxy?: FleetProxy, standalone?: boolean): FullAgentPolicyOutput;
export declare function generateFleetServerOutputSSLConfig(fleetServerHost: FleetServerHost | undefined): {
    [key: string]: FullAgentPolicyOutput;
} | undefined;
export declare function getFullMonitoringSettings(agentPolicy: Pick<AgentPolicy, 'namespace' | 'monitoring_enabled' | 'keep_monitoring_alive' | 'monitoring_pprof_enabled' | 'monitoring_http' | 'monitoring_diagnostics'>, monitoringOutput: Pick<Output, 'id' | 'is_default' | 'type'>): FullAgentPolicyMonitoring;
export declare function getBinarySourceSettings(downloadSource: DownloadSource, downloadSourceProxy: FleetProxy | undefined): FullAgentPolicyDownload;
