import React from 'react';
import type { EuiInMemoryTableProps } from '@elastic/eui';
import type { AgentPolicy, InMemoryPackagePolicy, PackagePolicy } from '../../../../../types';
interface Props {
    packagePolicies: PackagePolicy[];
    agentPolicy: AgentPolicy;
    loading?: EuiInMemoryTableProps<InMemoryPackagePolicy>['loading'];
    noItemsMessage?: EuiInMemoryTableProps<InMemoryPackagePolicy>['noItemsMessage'];
    refreshAgentPolicy: () => void;
}
export declare const PackagePoliciesTable: React.FunctionComponent<Props>;
export {};
