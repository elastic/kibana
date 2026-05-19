import React from 'react';
interface SingleDeleteProps {
    ruleName: string;
    ruleCount?: undefined;
}
interface BulkDeleteProps {
    ruleCount: number;
    ruleName?: undefined;
}
type DeleteConfirmationModalProps = (SingleDeleteProps | BulkDeleteProps) & {
    onCancel: () => void;
    onConfirm: () => void;
    isLoading: boolean;
};
export declare const DeleteConfirmationModal: ({ ruleName, ruleCount, onCancel, onConfirm, isLoading, }: DeleteConfirmationModalProps) => React.JSX.Element;
export {};
