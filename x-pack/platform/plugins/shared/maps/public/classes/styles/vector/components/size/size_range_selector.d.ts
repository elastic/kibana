import React from 'react';
import type { EuiDualRangeProps } from '@elastic/eui';
interface Props extends Omit<EuiDualRangeProps, 'value' | 'onChange' | 'min' | 'max'> {
    minSize: number;
    maxSize: number;
    onChange: ({ maxSize, minSize }: {
        maxSize: number;
        minSize: number;
    }) => void;
}
export declare function SizeRangeSelector({ minSize, maxSize, onChange, ...rest }: Props): React.JSX.Element;
export {};
