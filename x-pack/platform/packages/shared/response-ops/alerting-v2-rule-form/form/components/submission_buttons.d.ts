import React from 'react';
export interface SubmissionButtonsProps {
    isSubmitting: boolean;
    onCancel?: () => void;
    submitLabel?: React.ReactNode;
    cancelLabel?: React.ReactNode;
    ruleId?: string;
}
export declare const SubmissionButtons: ({ isSubmitting, onCancel, submitLabel, cancelLabel, ruleId, }: SubmissionButtonsProps) => React.JSX.Element;
