import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { AgentPolicy } from '../../../common';
import type { GetOneEnrollmentAPIKeyResponse } from '../../../common/types';
import type { CloudSecurityIntegration } from '../agent_enrollment_flyout/types';
export declare const InstallAzureArmTemplateManagedAgentStep: ({ selectedApiKeyId, apiKeyData, enrollToken, isComplete, cloudSecurityIntegration, agentPolicy, }: {
    selectedApiKeyId?: string;
    apiKeyData?: GetOneEnrollmentAPIKeyResponse | null;
    enrollToken?: string;
    isComplete?: boolean;
    cloudSecurityIntegration?: CloudSecurityIntegration | undefined;
    agentPolicy?: AgentPolicy;
}) => EuiContainedStepProps;
