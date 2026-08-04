import React from 'react';
import type { CasesUI } from '../../../../common';
import type { ItemsSelectionState } from '../types';
interface Props {
    selectedCases: CasesUI;
    tags: string[];
    isLoading: boolean;
    onChangeTags: (args: ItemsSelectionState) => void;
}
export declare const EditTagsSelectable: React.NamedExoticComponent<Props>;
export {};
