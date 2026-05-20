import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { GetOneEnrollmentAPIKeyResponse } from '../../../common/types';
export declare const InstallGoogleCloudShellManagedAgentStep: ({ selectedApiKeyId, apiKeyData, isComplete, cloudShellUrl, cloudShellCommand, projectId, }: {
    selectedApiKeyId?: string;
    apiKeyData?: GetOneEnrollmentAPIKeyResponse | null;
    isComplete?: boolean;
    cloudShellUrl?: string | undefined;
    cloudShellCommand?: string;
    projectId?: string;
}) => EuiContainedStepProps;
