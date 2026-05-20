import React from 'react';
import type { FleetProxy } from '../../../../types';
export interface FleetProxiesSectionProps {
    proxies: FleetProxy[];
    deleteFleetProxy: (proxy: FleetProxy) => void;
}
export declare const FleetProxiesSection: React.FunctionComponent<FleetProxiesSectionProps>;
