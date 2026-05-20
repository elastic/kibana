import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { GetOneEnrollmentAPIKeyResponse } from '../../../common/types';
import type { CloudSecurityIntegration } from '../agent_enrollment_flyout/types';
export declare const InstallCloudFormationManagedAgentStep: ({ selectedApiKeyId, apiKeyData, enrollToken, isComplete, cloudSecurityIntegration, fleetServerHost, }: {
    selectedApiKeyId?: string;
    apiKeyData?: GetOneEnrollmentAPIKeyResponse | null;
    enrollToken?: string;
    isComplete?: boolean;
    cloudSecurityIntegration?: CloudSecurityIntegration | undefined;
    fleetServerHost: string;
}) => EuiContainedStepProps;
