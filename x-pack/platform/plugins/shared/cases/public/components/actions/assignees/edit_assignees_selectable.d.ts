import React from 'react';
import type { CasesUI } from '../../../../common';
import type { ItemsSelectionState } from '../types';
interface Props {
    selectedCases: CasesUI;
    onChangeAssignees: (args: ItemsSelectionState) => void;
}
export declare const EditAssigneesSelectable: React.NamedExoticComponent<Props>;
export {};
