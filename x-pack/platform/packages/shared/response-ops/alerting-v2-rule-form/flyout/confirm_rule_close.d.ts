import React from 'react';
export interface ConfirmRuleCloseProps {
    onCancel: () => void;
    onConfirm: () => void;
}
export declare const ConfirmRuleClose: ({ onCancel, onConfirm }: ConfirmRuleCloseProps) => React.JSX.Element;
