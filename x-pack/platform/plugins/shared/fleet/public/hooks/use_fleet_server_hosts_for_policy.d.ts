import type { AgentPolicy } from '../types';
/**
 * Return Fleet server hosts urls and proxy for a given agent policy
 */
export declare function useFleetServerHostsForPolicy(agentPolicy?: Pick<AgentPolicy, 'id'> | null): {
    isLoadingInitialRequest: boolean;
    fleetServerHost: string;
    fleetServerHostConfig: import("../types").FleetServerHost | undefined;
    fleetProxy: import("../types").EnrollmentSettingsProxy | undefined;
    esOutput: import("../types").Output | undefined;
    esOutputProxy: import("../types").EnrollmentSettingsProxy | undefined;
    downloadSource: import("../types").DownloadSource | undefined;
    downloadSourceProxy: import("../types").EnrollmentSettingsProxy | undefined;
};
