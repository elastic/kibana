import type { EuiToolTipProps } from '@elastic/eui';
import type { ReactElement } from 'react';
import React from 'react';
interface Props {
    children: ReactElement<any>;
    tooltipContent?: EuiToolTipProps['content'];
}
export declare const OptionalToolTip: (props: Props) => React.JSX.Element;
export {};
