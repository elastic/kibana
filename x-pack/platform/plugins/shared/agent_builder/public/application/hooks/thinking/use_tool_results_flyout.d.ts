import type { ToolResult } from '@kbn/agent-builder-common';
export declare const useToolResultsFlyout: () => {
    toolResults: ToolResult[] | null;
    isOpen: boolean;
    openFlyout: (results: ToolResult[]) => void;
    closeFlyout: () => void;
};
