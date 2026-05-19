import React from 'react';
import { useEuiTheme } from '@elastic/eui';
export interface FilterPopoverOption {
    value: string;
    label: string;
    iconType?: string;
}
export declare const filterButtonStyles: (euiTheme: ReturnType<typeof useEuiTheme>["euiTheme"], buttonWidth?: number) => import("@emotion/react").SerializedStyles;
export declare const SingleSelectionFilterPopover: ({ label, options, dataTestSubj, popoverLabel, ariaLabel, buttonWidth, value, onChange, }: {
    label: string;
    options: FilterPopoverOption[];
    dataTestSubj: string;
    popoverLabel: string;
    ariaLabel: string;
    buttonWidth?: number;
    value: string;
    onChange: (value: string) => void;
}) => React.JSX.Element;
