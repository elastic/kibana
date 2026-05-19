import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { AgentPolicy, FleetProxy } from '../../types';
export declare function fetchRelatedSavedObjects(soClient: SavedObjectsClientContract, agentPolicy: AgentPolicy): Promise<{
    outputs: import("../../types").Output[];
    proxies: FleetProxy[];
    dataOutput: import("../../types").Output;
    monitoringOutput: import("../../types").Output;
    downloadSource: import("../../types").DownloadSourceBase & {
        id: string;
    };
    downloadSourceProxy: FleetProxy | undefined;
    fleetServerHost: import("../../types").FleetServerHost | undefined;
}>;
