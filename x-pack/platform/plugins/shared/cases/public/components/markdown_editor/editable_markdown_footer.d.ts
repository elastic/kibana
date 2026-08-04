import type { EuiButtonSize } from '@elastic/eui';
import React from 'react';
interface EditableMarkdownFooterProps {
    handleSaveAction: () => Promise<void>;
    handleCancelAction: () => void;
    isSaveDisabled: boolean;
    buttonSize?: EuiButtonSize;
}
export declare const EditableMarkdownFooter: React.NamedExoticComponent<EditableMarkdownFooterProps>;
export {};
