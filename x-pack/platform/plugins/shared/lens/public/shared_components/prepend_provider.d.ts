import { type EuiResizeObserverProps } from '@elastic/eui';
import React from 'react';
export declare const PrependWidthContext: React.Context<{
    minWidth: number;
    onResize: EuiResizeObserverProps["onResize"];
}>;
export declare const PrependWidthProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const Prepend: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
