import React from 'react';
import type { Output, FleetProxy } from '../../../../types';
export interface EditOutputFlyoutProps {
    defaultOutput?: Output;
    output?: Output;
    onClose: () => void;
    proxies: FleetProxy[];
}
export declare const EditOutputFlyout: React.FunctionComponent<EditOutputFlyoutProps>;
