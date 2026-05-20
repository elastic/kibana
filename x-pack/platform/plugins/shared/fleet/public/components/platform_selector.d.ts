import React from 'react';
import type { CommandsByPlatform } from '../applications/fleet/components/fleet_server_instructions/utils';
import type { CloudSecurityIntegration } from './agent_enrollment_flyout/types';
interface Props {
    installCommand: CommandsByPlatform;
    hasK8sIntegration: boolean;
    cloudSecurityIntegration?: CloudSecurityIntegration | undefined;
    hasK8sIntegrationMultiPage: boolean;
    isManaged?: boolean;
    hasFleetServer?: boolean;
    enrollToken?: string | undefined;
    fullCopyButton?: boolean;
    fleetServerHost?: string;
    onCopy?: () => void;
}
export declare const PlatformSelector: React.FunctionComponent<Props>;
export {};
