import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { CommandsByPlatform } from '../../../applications/fleet/components/fleet_server_instructions/utils/install_command_utils';
import type { CloudSecurityIntegration, K8sMode } from '../types';
export declare const InstallStandaloneAgentStep: ({ installCommand, isK8s, cloudSecurityIntegration, isComplete, fullCopyButton, onCopy, rootIntegrations, nonFipsIntegrations, }: {
    installCommand: CommandsByPlatform;
    isK8s?: K8sMode;
    cloudSecurityIntegration?: CloudSecurityIntegration | undefined;
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
