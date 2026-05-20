import React from 'react';
import type { CloudSecurityIntegration } from '../agent_enrollment_flyout/types';
interface Props {
    enrollmentAPIKey?: string;
    cloudSecurityIntegration: CloudSecurityIntegration;
    fleetServerHost: string;
}
export declare const CloudFormationInstructions: React.FunctionComponent<Props>;
export {};
