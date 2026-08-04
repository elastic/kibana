import React from 'react';
import type { CasesUI } from '../../../../common';
import type { UseActionProps } from '../types';
export declare const useAssigneesAction: ({ onAction, onActionSuccess, isDisabled }: UseActionProps) => {
    getAction: (selectedCases: CasesUI) => {
        name: string;
        onClick: () => void;
        disabled: boolean;
        'data-test-subj': string;
        icon: React.JSX.Element;
        key: string;
    };
    isFlyoutOpen: boolean;
    onFlyoutClosed: () => void;
    onSaveAssignees: (itemsSelection: import("../types").ItemsSelectionState) => void;
};
export type UseAssigneesAction = ReturnType<typeof useAssigneesAction>;
