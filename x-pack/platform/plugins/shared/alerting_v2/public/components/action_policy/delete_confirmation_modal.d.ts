import React from 'react';
interface DeleteActionPolicyConfirmModalProps {
    policyName: string;
    onCancel: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}
export declare const DeleteActionPolicyConfirmModal: ({ policyName, onCancel, onConfirm, isLoading, }: DeleteActionPolicyConfirmModalProps) => React.JSX.Element;
export {};
