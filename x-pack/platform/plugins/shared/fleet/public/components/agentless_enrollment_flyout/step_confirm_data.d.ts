import React from 'react';
import type { EuiStepStatus } from '@elastic/eui';
import type { Agent, PackagePolicy, RegistryPolicyTemplate } from '../../types';
export declare const AgentlessStepConfirmData: ({ agent, packagePolicy, setConfirmDataStatus, policyTemplates, }: {
    agent: Agent;
    packagePolicy: PackagePolicy;
    setConfirmDataStatus: (status: EuiStepStatus) => void;
    policyTemplates?: RegistryPolicyTemplate[];
}) => React.JSX.Element | null;
