import React from 'react';
import type { FleetProxy } from '../../../../types';
export interface FleetProxiesTableProps {
    proxies: FleetProxy[];
    deleteFleetProxy: (ds: FleetProxy) => void;
}
export declare const FleetProxiesTable: React.FunctionComponent<FleetProxiesTableProps>;
