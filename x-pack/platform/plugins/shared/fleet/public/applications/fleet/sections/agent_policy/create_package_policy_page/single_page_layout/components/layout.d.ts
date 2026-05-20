import React from 'react';
import type { AgentPolicy, NewPackagePolicy, PackageInfo, RegistryPolicyTemplate } from '../../../../../types';
import type { EditPackagePolicyFrom } from '../../types';
export declare const CreatePackagePolicySinglePageLayout: React.FunctionComponent<{
    from: EditPackagePolicyFrom;
    cancelUrl: string;
    onCancel?: React.ReactEventHandler;
    agentPolicy?: AgentPolicy;
    packageInfo?: PackageInfo;
    integrationInfo?: RegistryPolicyTemplate;
    defaultPolicyData?: Partial<NewPackagePolicy>;
    'data-test-subj'?: string;
    tabs?: Array<{
        title: string;
        isSelected: boolean;
        onClick: React.ReactEventHandler;
    }>;
    children: React.ReactNode;
}>;
