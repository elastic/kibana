import React from 'react';
import type { FleetServerHost } from '../../../../types';
export interface FleetServerHostsSectionProps {
    fleetServerHosts: FleetServerHost[];
    deleteFleetServerHost: (fleetServerHost: FleetServerHost) => void;
}
export declare const FleetServerHostsSection: React.FunctionComponent<FleetServerHostsSectionProps>;
