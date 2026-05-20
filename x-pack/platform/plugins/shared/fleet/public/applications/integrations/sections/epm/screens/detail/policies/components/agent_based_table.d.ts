import React from 'react';
import type { AgentPolicy, InMemoryPackagePolicy } from '../../../../../../types';
import type { usePagination } from '../../../../../../hooks';
export declare const AgentBasedPackagePoliciesTable: ({ isLoading, packagePolicies, packagePoliciesTotal, refreshPackagePolicies, pagination, addAgentToPolicyIdFromParams, showAddAgentHelpForPolicyId, from, }: {
    isLoading: boolean;
    packagePolicies: Array<{
        agentPolicies: AgentPolicy[];
        packagePolicy: InMemoryPackagePolicy;
        rowIndex: number;
    }>;
    packagePoliciesTotal: number;
    refreshPackagePolicies: () => void;
    pagination: ReturnType<typeof usePagination>;
    addAgentToPolicyIdFromParams?: string | null;
    showAddAgentHelpForPolicyId?: string | null;
    from?: "installed-integrations";
}) => React.JSX.Element;
