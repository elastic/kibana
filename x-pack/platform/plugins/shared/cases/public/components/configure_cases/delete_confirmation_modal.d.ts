import React from 'react';
interface ConfirmDeleteCaseModalProps {
    title: string;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
}
export declare const DeleteConfirmationModal: React.NamedExoticComponent<ConfirmDeleteCaseModalProps>;
export {};
