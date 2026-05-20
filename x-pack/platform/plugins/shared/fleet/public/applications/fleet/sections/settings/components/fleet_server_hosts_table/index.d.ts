import React from 'react';
import type { FleetServerHost } from '../../../../types';
export interface FleetServerHostsTableProps {
    fleetServerHosts: FleetServerHost[];
    deleteFleetServerHost: (fleetServerHost: FleetServerHost) => void;
}
export declare const FleetServerHostsTable: React.FunctionComponent<FleetServerHostsTableProps>;
