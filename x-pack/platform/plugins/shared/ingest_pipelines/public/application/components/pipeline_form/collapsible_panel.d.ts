import type { ReactNode } from 'react';
import React from 'react';
import type { EuiAccordionProps, EuiSwitchProps } from '@elastic/eui';
export interface CollapsiblePanelRenderProps {
    isEnabled: boolean;
}
interface Props {
    title: ReactNode | string;
    fieldName: string;
    initialToggleState: boolean;
    toggleProps?: Partial<EuiSwitchProps>;
    accordionProps?: Partial<EuiAccordionProps>;
    children: (options: CollapsiblePanelRenderProps) => ReactNode;
}
export declare const CollapsiblePanel: React.FunctionComponent<Props>;
export {};
