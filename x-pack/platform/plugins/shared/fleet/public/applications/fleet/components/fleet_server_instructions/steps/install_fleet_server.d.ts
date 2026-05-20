import type { EuiStepProps } from '@elastic/eui';
import type { FleetServerHost } from '../../../types';
import type { DeploymentMode } from './set_deployment_mode';
export declare function getInstallFleetServerStep({ isFleetServerReady, disabled, serviceToken, fleetServerHost, fleetServerPolicyId, deploymentMode, }: {
    isFleetServerReady: boolean;
    disabled: boolean;
    serviceToken?: string;
    fleetServerHost?: FleetServerHost | null;
    fleetServerPolicyId?: string;
    deploymentMode: DeploymentMode;
}): EuiStepProps;
