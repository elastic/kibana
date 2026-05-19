import React from 'react';
interface EditableMarkdownFooterProps {
    handleSaveAction: () => Promise<void>;
    handleCancelAction: () => void;
    isSaveDisabled: boolean;
}
export declare const EditableMarkdownFooter: React.NamedExoticComponent<EditableMarkdownFooterProps>;
export {};
