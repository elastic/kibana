import React from 'react';
import type { AgentPolicy, NewAgentPolicy, PackageInfo } from '../../../../../types';
import type { ValidationResults } from '../../../components/agent_policy_validation';
export declare enum SelectedPolicyTab {
    NEW = "new",
    EXISTING = "existing"
}
interface Props {
    agentPolicies: AgentPolicy[];
    updateAgentPolicies: (u: AgentPolicy[]) => void;
    newAgentPolicy: Partial<NewAgentPolicy>;
    updateNewAgentPolicy: (u: Partial<NewAgentPolicy>) => void;
    withSysMonitoring: boolean;
    updateSysMonitoring: (newValue: boolean) => void;
    validation: ValidationResults;
    packageInfo?: PackageInfo;
    setHasAgentPolicyError: (hasError: boolean) => void;
    updateSelectedTab: (tab: SelectedPolicyTab) => void;
    selectedAgentPolicyIds: string[];
    initialSelectedTabIndex?: number;
}
export declare const StepSelectHosts: React.FunctionComponent<Props>;
export {};
