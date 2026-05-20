import React from 'react';
interface ConfirmActionModalProps {
    count: number;
    onCancel: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}
export declare const ConfirmRevokeModal: ({ count, onCancel, onConfirm, isLoading, }: ConfirmActionModalProps) => React.JSX.Element;
export declare const ConfirmDeleteModal: ({ count, onCancel, onConfirm, isLoading, }: ConfirmActionModalProps) => React.JSX.Element;
export {};
