import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { GetOneEnrollmentAPIKeyResponse } from '../../../../common/types/rest_spec/enrollment_api_key';
import type { CommandsByPlatform } from '../../../applications/fleet/components/fleet_server_instructions/utils/install_command_utils';
import type { K8sMode, CloudSecurityIntegration } from '../types';
export declare const InstallManagedAgentStep: ({ installCommand, selectedApiKeyId, apiKeyData, isK8s, cloudSecurityIntegration, enrollToken, fleetServerHost, isComplete, fullCopyButton, onCopy, rootIntegrations, nonFipsIntegrations, }: {
    selectedApiKeyId?: string;
    apiKeyData?: GetOneEnrollmentAPIKeyResponse | null;
    isK8s?: K8sMode;
    cloudSecurityIntegration?: CloudSecurityIntegration | undefined;
    enrollToken?: string;
    fleetServerHost?: string;
    installCommand: CommandsByPlatform;
    isComplete?: boolean;
    fullCopyButton?: boolean;
    onCopy?: () => void;
    rootIntegrations?: Array<{
        name: string;
        title: string;
    }>;
    nonFipsIntegrations?: Array<{
        name: string;
        title: string;
    }>;
}) => EuiContainedStepProps;
