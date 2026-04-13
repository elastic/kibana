import React from 'react';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
interface SelectorProps {
    dataTestSubj?: string;
    isLoading?: boolean;
    options: Item[];
    loadingMessage?: string;
    label: string;
    searchPlaceholder: string;
    noneAvailableMessage: string;
    noneMatchingMessage: string;
    onOptionsChange: (options: Item[]) => void;
}
export interface Item {
    label: string;
    checked?: EuiSelectableOptionCheckedType;
}
export declare function Selector({ dataTestSubj, isLoading, options, loadingMessage, label, searchPlaceholder, noneAvailableMessage, noneMatchingMessage, onOptionsChange, }: SelectorProps): React.JSX.Element;
export {};
