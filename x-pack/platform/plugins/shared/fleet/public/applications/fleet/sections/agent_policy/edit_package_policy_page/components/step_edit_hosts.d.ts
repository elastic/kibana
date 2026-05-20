import React from 'react';
import type { AgentPolicy, NewAgentPolicy, PackageInfo } from '../../../../types';
import type { ValidationResults } from '../../components/agent_policy_validation';
import { SelectedPolicyTab } from '../../create_package_policy_page/components';
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
    selectedAgentPolicyIds: string[];
    updateSelectedTab: (tab: SelectedPolicyTab) => void;
}
export declare const StepEditHosts: React.FunctionComponent<Props>;
export {};
