import React from 'react';
interface ConfirmDeleteCaseModalProps {
    totalCasesToBeDeleted: number;
    onCancel: () => void;
    onConfirm: () => void;
    focusButtonRef?: React.Ref<HTMLAnchorElement | HTMLButtonElement>;
}
export declare const ConfirmDeleteCaseModal: React.NamedExoticComponent<ConfirmDeleteCaseModalProps>;
export {};
