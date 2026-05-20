import type { AgentPolicy } from '../types';
import type { PackageInfo } from '../../../../common/types';
export type IncompatibleAgentVersionResult = {
    status: 'NONE';
} | {
    status: 'SOME' | 'ALL';
    versionCondition: string;
};
export declare const useIncompatibleAgentVersionStatus: (packageInfo: PackageInfo | undefined, agentPolicies: AgentPolicy[] | undefined) => IncompatibleAgentVersionResult;
export declare const getIncompatibleAgentVersionStatus: (packageInfo: PackageInfo | undefined, agentPolicies: AgentPolicy[] | undefined) => IncompatibleAgentVersionResult;
