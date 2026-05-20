import React from 'react';
import type { FleetServerHost } from '../../../types';
interface FleetServerHostSelectProps {
    selectedFleetServerHost?: FleetServerHost;
    fleetServerHosts: FleetServerHost[];
    setFleetServerHost: (host: FleetServerHost | null | undefined) => void;
}
export declare const FleetServerHostSelect: React.FunctionComponent<FleetServerHostSelectProps>;
export {};
