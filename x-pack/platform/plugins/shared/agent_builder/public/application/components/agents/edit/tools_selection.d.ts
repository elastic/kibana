import React from 'react';
import type { ToolSelection, ToolDefinition } from '@kbn/agent-builder-common';
interface ToolsSelectionProps {
    tools: ToolDefinition[];
    toolsLoading: boolean;
    selectedTools: ToolSelection[];
    onToolsChange: (tools: ToolSelection[]) => void;
    disabled?: boolean;
    showActiveOnly?: boolean;
    onShowActiveOnlyChange?: (showActiveOnly: boolean) => void;
    areElasticCapabilitiesEnabled?: boolean;
}
export declare const ToolsSelection: React.FC<ToolsSelectionProps>;
export {};
