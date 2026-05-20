import React from 'react';
interface BulkDeleteConfirmationModalProps {
    count: number;
    onCancel: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}
export declare const BulkDeleteConfirmationModal: ({ count, onCancel, onConfirm, isLoading, }: BulkDeleteConfirmationModalProps) => React.JSX.Element;
export {};
