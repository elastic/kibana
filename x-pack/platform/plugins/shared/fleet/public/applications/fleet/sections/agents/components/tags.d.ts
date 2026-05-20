import { type EuiTextProps } from '@elastic/eui';
import React from 'react';
interface Props {
    tags: string[];
    color?: EuiTextProps['color'];
    size?: EuiTextProps['size'];
}
export declare const Tags: React.FunctionComponent<Props>;
export {};
