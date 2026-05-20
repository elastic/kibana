import type { Output } from '../../../types';
export declare function getAgentAndPolicyCountForOutput(output: Output): Promise<{
    agentPolicyCount: number;
    agentCount: number;
}>;
