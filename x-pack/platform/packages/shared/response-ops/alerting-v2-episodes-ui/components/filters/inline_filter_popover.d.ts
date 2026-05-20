import React from 'react';
interface InlineFilterPopoverProps {
    options: Array<{
        label: string;
        value: string;
    }>;
    selectedValues: string[];
    singleSelect: boolean;
    onSelectionChange: (values: string[]) => void;
    searchable?: boolean;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    emptyMessage: string;
    isLoading?: boolean;
    'data-test-subj': string;
}
export declare function InlineFilterPopover({ options, selectedValues, singleSelect, onSelectionChange, searchable, searchValue, onSearchChange, searchPlaceholder, emptyMessage, isLoading, 'data-test-subj': dataTestSubj, }: InlineFilterPopoverProps): React.JSX.Element;
export {};
