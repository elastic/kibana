import React from 'react';
import type { IconSize } from '@elastic/eui';
export interface ConnectorTypeIconProps {
    actionTypeId: string;
    size?: IconSize;
}
export declare const ConnectorTypeIcon: React.FC<ConnectorTypeIconProps>;
