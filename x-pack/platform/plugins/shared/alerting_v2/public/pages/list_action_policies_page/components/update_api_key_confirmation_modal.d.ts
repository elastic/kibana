import React from 'react';
interface UpdateApiKeyConfirmationModalProps {
    count: number;
    onCancel: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}
export declare const UpdateApiKeyConfirmationModal: ({ count, onCancel, onConfirm, isLoading, }: UpdateApiKeyConfirmationModalProps) => React.JSX.Element;
export {};
