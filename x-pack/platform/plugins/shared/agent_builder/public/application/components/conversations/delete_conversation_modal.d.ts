import React from 'react';
export interface BaseDeleteConversationModalProps {
    onClose: () => void;
    conversationId: string;
    title: string;
    onDelete: (conversationId: string) => Promise<void>;
}
export declare const BaseDeleteConversationModal: React.FC<BaseDeleteConversationModalProps>;
interface DeleteConversationModalProps {
    isOpen: boolean;
    onClose: () => void;
}
export declare const DeleteConversationModal: React.FC<DeleteConversationModalProps>;
export {};
