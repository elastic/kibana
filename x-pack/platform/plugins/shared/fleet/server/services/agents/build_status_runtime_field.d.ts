import type { estypes } from '@elastic/elasticsearch';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import { agentPolicyService } from '../agent_policy';
export type InactivityTimeouts = Awaited<ReturnType<(typeof agentPolicyService)['getInactivityTimeouts']>>;
type StatusRuntimeMapping = NonNullable<estypes.MappingRuntimeFields> & {
    status: {
        type: 'keyword';
        script: {
            lang: 'painless';
            source: string;
        };
    };
};
export declare function _buildStatusRuntimeField(opts: {
    inactivityTimeouts: InactivityTimeouts;
    maxAgentPoliciesWithInactivityTimeout?: number;
    pathPrefix?: string;
    logger?: Logger;
}): StatusRuntimeMapping;
export declare function buildAgentStatusRuntimeField(soClient?: SavedObjectsClientContract, // Deprecated, it's now using an internal client
pathPrefix?: string): Promise<StatusRuntimeMapping>;
export {};
