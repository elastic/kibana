import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import React from 'react';
export declare const FilterGroup: ({ filterGroupButtonLabel, items, onChange, }: {
    filterGroupButtonLabel: string;
    items: EuiSelectableOption[];
    onChange: Required<EuiSelectableProps>["onChange"];
}) => React.JSX.Element;
