import React from 'react';
import type { AgentPolicy, InMemoryPackagePolicy } from '../../../../../../types';
export declare const PackagePolicyUpgradeCell: React.FC<{
    packagePolicy: InMemoryPackagePolicy;
    agentPolicies: AgentPolicy[];
    from?: string;
}>;
