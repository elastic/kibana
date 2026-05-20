import React from 'react';
import type { EuiMarkdownFormatProps } from '@elastic/eui';
interface Props {
    children: string;
    disableLinks?: boolean;
    textSize?: EuiMarkdownFormatProps['textSize'];
}
export declare const MarkdownRenderer: React.NamedExoticComponent<Props>;
export {};
