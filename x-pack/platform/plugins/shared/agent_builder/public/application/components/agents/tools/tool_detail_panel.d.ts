import React from 'react';
interface ToolDetailPanelProps {
    toolId: string;
    onRemove: () => void;
    isAutoIncluded: boolean;
    canEditAgent: boolean;
}
export declare const ToolDetailPanel: React.FC<ToolDetailPanelProps>;
export {};
