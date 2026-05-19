import type { FleetConfigType } from '../../config';
export { isOnlyAgentlessIntegration } from '../../../common/services/agentless_policy_helper';
export declare const isAgentlessEnabled: () => boolean;
type AgentlessApiEndpoints = '/deployments' | `/deployments/${string}`;
export interface AgentlessConfig {
    enabled?: boolean;
    api?: {
        url?: string;
        tls?: {
            certificate?: string;
            key?: string;
            ca?: string;
        };
    };
}
export declare const prependAgentlessApiBasePathToEndpoint: (agentlessConfig: FleetConfigType["agentless"], endpoint: AgentlessApiEndpoints) => string;
