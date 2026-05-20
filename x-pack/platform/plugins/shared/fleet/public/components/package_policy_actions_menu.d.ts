import React from 'react';
import type { AgentPolicy, InMemoryPackagePolicy } from '../types';
export declare const PackagePolicyActionsMenu: React.FunctionComponent<{
    agentPolicies: AgentPolicy[];
    packagePolicy: InMemoryPackagePolicy;
    showAddAgent?: boolean;
    defaultIsOpen?: boolean;
    upgradePackagePolicyHref?: string;
    from?: 'fleet-policy-list' | 'installed-integrations' | undefined;
}>;
