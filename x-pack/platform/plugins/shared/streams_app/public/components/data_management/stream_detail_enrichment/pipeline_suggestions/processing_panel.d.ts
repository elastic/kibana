import React from 'react';
interface ProcessingPanelProps {
    message: string;
    children?: React.ReactNode;
    showTechPreviewBadge?: boolean;
}
export declare function ProcessingPanel({ message, children, showTechPreviewBadge, }: ProcessingPanelProps): React.JSX.Element;
export {};
