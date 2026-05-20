import React from 'react';
interface FilterPopoverProps {
    onChange: (params: {
        filterId: string;
        selectedOptionKeys: string[];
    }) => void;
    selectedOptionKeys: string[];
    availableSolutions: string[];
}
export declare const SolutionFilterComponent: {
    ({ onChange, selectedOptionKeys, availableSolutions, }: FilterPopoverProps): React.JSX.Element;
    displayName: string;
};
export declare const SolutionFilter: React.MemoExoticComponent<{
    ({ onChange, selectedOptionKeys, availableSolutions, }: FilterPopoverProps): React.JSX.Element;
    displayName: string;
}>;
export {};
