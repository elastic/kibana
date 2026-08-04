import React from 'react';
interface InputActionsProps {
    onSubmit: () => void;
    isSubmitDisabled: boolean;
    resetToPendingMessage: () => void;
    agentId?: string;
}
export declare const InputActions: React.FC<InputActionsProps>;
export {};
