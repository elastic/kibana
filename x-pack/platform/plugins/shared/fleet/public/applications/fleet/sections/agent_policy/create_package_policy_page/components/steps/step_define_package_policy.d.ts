import React from 'react';
import type { PackageInfo, NewPackagePolicy, AgentPolicy } from '../../../../../types';
import type { PackagePolicyValidationResults } from '../../services';
export declare const StepDefinePackagePolicy: React.FunctionComponent<{
    namespacePlaceholder?: string;
    packageInfo: PackageInfo;
    packagePolicy: NewPackagePolicy;
    updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
    validationResults: PackagePolicyValidationResults | undefined;
    submitAttempted: boolean;
    isEditPage?: boolean;
    noAdvancedToggle?: boolean;
    isAgentlessSelected?: boolean;
    agentPolicies?: AgentPolicy[];
    onNamespaceCustomizationEnabledChange?: (enabled: boolean, isInit?: boolean) => void;
    packagePolicyId?: string;
}>;
