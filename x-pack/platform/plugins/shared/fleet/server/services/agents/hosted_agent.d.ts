import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Agent } from '../../types';
export declare function getHostedPolicies(soClient: SavedObjectsClientContract, agents: Agent[]): Promise<{
    [key: string]: boolean;
}>;
export declare function isHostedAgent(hostedPolicies: {
    [key: string]: boolean;
}, agent: Agent): boolean | "" | undefined;
