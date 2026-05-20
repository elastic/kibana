import React from 'react';
interface ReportDestructiveActionConfirmationModalProps {
    title: string;
    message: string;
    onCancel: () => void;
    onConfirm: () => void;
    confirmButtonText?: string;
}
export declare const ReportDestructiveActionConfirmationModal: React.NamedExoticComponent<ReportDestructiveActionConfirmationModalProps>;
export {};
