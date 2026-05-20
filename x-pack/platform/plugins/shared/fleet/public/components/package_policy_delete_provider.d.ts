import React from 'react';
import type { AgentPolicy, PackagePolicyPackage } from '../types';
interface Props {
    agentPolicies?: AgentPolicy[];
    from?: 'fleet-policy-list' | 'installed-integrations' | undefined;
    packagePolicyPackage?: PackagePolicyPackage;
    isAgentlessPolicy?: boolean | null;
    children: (deletePackagePoliciesPrompt: DeletePackagePoliciesPrompt) => React.ReactElement;
}
export type DeletePackagePoliciesPrompt = (packagePoliciesToDelete: string[], onSuccess?: OnSuccessCallback) => void;
type OnSuccessCallback = (packagePoliciesDeleted: string[]) => void;
export declare const PackagePolicyDeleteProvider: React.FunctionComponent<Props>;
export {};
