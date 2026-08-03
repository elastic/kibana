import type { PropsWithChildren, ReactNode } from 'react';
import React from 'react';
export interface McpClientDetailsFieldProps {
    label: ReactNode;
    actions?: ReactNode[];
    append?: ReactNode;
}
export declare const McpClientDetailsField: ({ label, actions, append, children, }: PropsWithChildren<McpClientDetailsFieldProps>) => React.JSX.Element;
