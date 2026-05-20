import React from 'react';
import type { AgentPolicy } from '../../../common';
import type { CloudSecurityIntegration } from '../agent_enrollment_flyout/types';
interface Props {
    enrollmentAPIKey?: string;
    cloudSecurityIntegration: CloudSecurityIntegration;
    agentPolicy?: AgentPolicy;
}
export declare const AzureArmTemplateInstructions: React.FunctionComponent<Props>;
export {};
