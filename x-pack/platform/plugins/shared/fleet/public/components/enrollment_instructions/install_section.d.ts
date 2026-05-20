import React from 'react';
import type { CommandsByPlatform } from '../../applications/fleet/components/fleet_server_instructions/utils';
import type { K8sMode, CloudSecurityIntegration } from '../agent_enrollment_flyout/types';
interface Props {
    installCommand: CommandsByPlatform;
    isK8s: K8sMode | undefined;
    cloudSecurityIntegration: CloudSecurityIntegration | undefined;
    enrollToken?: string;
    fleetServerHost?: string;
    fullCopyButton?: boolean;
    isManaged?: boolean;
    onCopy?: () => void;
    rootIntegrations?: Array<{
        name: string;
        title: string;
    }>;
    nonFipsIntegrations?: Array<{
        name: string;
        title: string;
    }>;
}
export declare const InstallSection: React.FunctionComponent<Props>;
export {};
