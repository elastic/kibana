import React from 'react';
import { type SerializedStyles } from '@emotion/react';
import type { EuiSelectableOption } from '@elastic/eui';
type FilterOption<T extends string, K extends string = string> = EuiSelectableOption<{
    key: K;
    label: T;
}>;
export type { FilterOption as MultiSelectFilterOption };
export declare const mapToMultiSelectOption: <T extends string>(options: T[]) => {
    key: T;
    label: T;
}[];
interface UseFilterParams<T extends string, K extends string = string> {
    buttonIconType?: string;
    buttonLabel?: string;
    hideActiveOptionsNumber?: boolean;
    id: string;
    limit?: number;
    limitReachedMessage?: string;
    onChange: (params: {
        filterId: string;
        selectedOptionKeys: string[];
    }) => void;
    options: Array<FilterOption<T, K>>;
    renderOption?: (option: FilterOption<T, K>) => React.ReactNode;
    selectedOptionKeys?: string[];
    isLoading: boolean;
    buttonCss?: SerializedStyles;
}
export declare const MultiSelectFilter: {
    <T extends string, K extends string = string>({ buttonLabel, buttonIconType, hideActiveOptionsNumber, id, limit, limitReachedMessage, onChange, options: rawOptions, selectedOptionKeys, renderOption, isLoading, buttonCss, }: UseFilterParams<T, K>): React.JSX.Element;
    displayName: string;
};
