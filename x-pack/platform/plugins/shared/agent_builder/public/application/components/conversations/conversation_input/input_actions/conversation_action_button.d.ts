import React from 'react';
interface ConversationActionButtonProps {
    onSubmit: () => void;
    isSubmitDisabled: boolean;
    resetToPendingMessage: () => void;
}
export declare const ConversationActionButton: React.FC<ConversationActionButtonProps>;
export {};
