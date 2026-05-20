import React from 'react';
import type { EuiToolTipProps } from '@elastic/eui';
import type { EuiButton } from '@elastic/eui';
type EuiButtonPropsFull = Parameters<typeof EuiButton>[0];
export declare const EuiButtonWithTooltip: React.FC<EuiButtonPropsFull & {
    tooltip?: Partial<EuiToolTipProps>;
}>;
export {};
