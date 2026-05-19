import React from 'react';
import type { EuiSelectableOption, EuiSelectableProps, IconType } from '@elastic/eui';
export type SelectableEntry = EuiSelectableOption<{
    value: string;
    description?: string;
    icon?: IconType;
}>;
export declare const ChartSwitchSelectable: ({ setSearchTerm, searchTerm, ...props }: {
    setSearchTerm: (val: string) => void;
    searchTerm: string;
} & EuiSelectableProps) => React.JSX.Element;
