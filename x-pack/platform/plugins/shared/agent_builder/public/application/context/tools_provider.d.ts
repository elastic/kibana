import React from 'react';
import type { ToolType } from '@kbn/agent-builder-common';
export interface ToolsActionsContextType {
    createTool: (toolType: ToolType) => void;
    editTool: (toolId: string) => void;
    viewTool: (toolId: string) => void;
    deleteTool: (toolId: string, callbacks?: {
        onConfirm?: () => void;
        onCancel?: () => void;
    }) => void;
    bulkDeleteTools: (toolIds: string[]) => void;
    cloneTool: (toolId: string) => void;
    testTool: (toolId: string) => void;
    getCreateToolUrl: (toolType: ToolType) => string;
    getEditToolUrl: (toolId: string) => string;
    getCloneToolUrl: (toolId: string) => string;
    getViewToolUrl: (toolId: string) => string;
}
export declare const ToolsActionsContext: React.Context<ToolsActionsContextType | undefined>;
export declare const ToolsProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useToolsActions: () => ToolsActionsContextType;
