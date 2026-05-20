import React from 'react';
import type { CasesUI } from '../../../../common';
import type { ItemsSelectionState } from '../types';
interface Props {
    selectedCases: CasesUI;
    onClose: () => void;
    onSaveAssignees: (args: ItemsSelectionState) => void;
    focusButtonRef?: React.Ref<HTMLButtonElement>;
}
export declare const EditAssigneesFlyout: React.NamedExoticComponent<Props>;
export {};
