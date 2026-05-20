import React from 'react';
interface ButtonsFooterProps {
    cancelButtonText?: React.ReactNode;
    actionButtonText?: React.ReactNode;
    onAction?: () => void;
    onCancel?: () => void;
    hideCancel?: boolean;
    hideActionButton?: boolean;
    isActionDisabled?: boolean;
    isActionLoading?: boolean;
    isCancelDisabled?: boolean;
}
export declare const ButtonsFooter: React.NamedExoticComponent<ButtonsFooterProps>;
export {};
