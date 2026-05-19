import React from 'react';
export interface BaseRenameConversationModalProps {
    onClose: () => void;
    conversationId: string;
    initialTitle: string;
    onRename: (conversationId: string, title: string) => Promise<void>;
}
export declare const BaseRenameConversationModal: React.FC<BaseRenameConversationModalProps>;
interface RenameConversationModalProps {
    isOpen: boolean;
    onClose: () => void;
}
export declare const RenameConversationModal: React.FC<RenameConversationModalProps>;
export {};
