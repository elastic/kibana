import type { EuiToolTipProps } from '@elastic/eui';
import React from 'react';
interface Props {
    'data-test-subj'?: string;
    tooltipContent?: EuiToolTipProps['content'];
}
export declare const DeprecatedBadge: (props: Props) => React.JSX.Element;
export {};
