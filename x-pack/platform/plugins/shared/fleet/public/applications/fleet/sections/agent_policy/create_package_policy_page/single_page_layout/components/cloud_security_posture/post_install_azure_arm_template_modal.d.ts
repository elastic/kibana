import React from 'react';
import type { AgentPolicy, PackagePolicy } from '../../../../../../types';
export declare const PostInstallAzureArmTemplateModal: React.FunctionComponent<{
    onConfirm: () => void;
    onCancel: () => void;
    agentPolicy: AgentPolicy;
    packagePolicy: PackagePolicy;
}>;
