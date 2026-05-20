import React from 'react';
import type { FleetProxy } from '../../../../types';
export interface FleetProxyFlyoutProps {
    onClose: () => void;
    fleetProxy?: FleetProxy;
}
export declare const FleetProxyFlyout: React.FunctionComponent<FleetProxyFlyoutProps>;
