import React from 'react';
import type { MessageEditorInstance } from './use_message_editor';
interface MessageEditorProps {
    messageEditor: MessageEditorInstance;
    onSubmit: () => void;
    disabled?: boolean;
    placeholder?: string;
    ariaLabel?: string;
    'data-test-subj'?: string;
}
export declare const MessageEditor: React.FC<MessageEditorProps>;
export {};
