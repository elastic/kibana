import React from 'react';
import type { AgentPolicy, InMemoryPackagePolicy } from '../../../../../../types';
import type { usePagination } from '../../../../../../hooks';
export declare const AgentlessPackagePoliciesTable: ({ isLoading, packagePolicies, packagePoliciesTotal, refreshPackagePolicies, pagination, from, }: {
    isLoading: boolean;
    packagePolicies: Array<{
        agentPolicies: AgentPolicy[];
        packagePolicy: InMemoryPackagePolicy;
        rowIndex: number;
    }>;
    packagePoliciesTotal: number;
    refreshPackagePolicies: () => void;
    pagination: ReturnType<typeof usePagination>;
    from?: "installed-integrations";
}) => React.JSX.Element;
