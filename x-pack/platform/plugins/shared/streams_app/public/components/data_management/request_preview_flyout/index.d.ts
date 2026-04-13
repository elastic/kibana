import React from 'react';
interface RequestPreviewFlyoutProps {
    codeContent: string;
    title?: string;
    description?: string;
    onClose: () => void;
}
export declare const RequestPreviewFlyout: ({ codeContent, title, description, onClose, }: RequestPreviewFlyoutProps) => React.JSX.Element;
export {};
