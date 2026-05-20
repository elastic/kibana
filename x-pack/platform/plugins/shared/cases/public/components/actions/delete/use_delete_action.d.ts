import React from 'react';
import type { CasesUI } from '../../../../common';
import type { UseActionProps } from '../types';
export declare const useDeleteAction: ({ onAction, onActionSuccess, isDisabled }: UseActionProps) => {
    getAction: (selectedCases: CasesUI) => {
        name: React.JSX.Element;
        onClick: () => void;
        disabled: boolean;
        'data-test-subj': string;
        icon: React.JSX.Element;
        key: string;
    };
    isModalVisible: boolean;
    onConfirmDeletion: () => void;
    onCloseModal: () => void;
    canDelete: boolean;
};
export type UseDeleteAction = ReturnType<typeof useDeleteAction>;
