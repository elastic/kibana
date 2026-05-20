import React from 'react';
import type { FleetServerHost, FleetProxy } from '../../../../types';
export interface FleetServerHostsFlyoutProps {
    onClose: () => void;
    fleetServerHost?: FleetServerHost;
    defaultFleetServerHost?: FleetServerHost;
    proxies: FleetProxy[];
}
export declare const FleetServerHostsFlyout: React.FunctionComponent<FleetServerHostsFlyoutProps>;
