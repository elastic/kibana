import React from 'react';
import type { AgentPolicy } from '../../../common';
import type { CloudSecurityIntegrationAzureAccountType } from '../agent_enrollment_flyout/types';
export declare const AzureArmTemplateGuide: ({ azureAccountType, agentPolicy, enrollmentToken, }: {
    azureAccountType?: CloudSecurityIntegrationAzureAccountType;
    agentPolicy?: AgentPolicy;
    enrollmentToken?: string;
}) => React.JSX.Element;
