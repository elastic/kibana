import React from 'react';
import type { CasesUI } from '../../../../common';
import type { ItemsSelectionState } from '../types';
interface Props {
    selectedCases: CasesUI;
    onClose: () => void;
    onSaveTags: (args: ItemsSelectionState) => void;
    focusButtonRef?: React.Ref<HTMLButtonElement>;
}
export declare const EditTagsFlyout: React.NamedExoticComponent<Props>;
export {};
