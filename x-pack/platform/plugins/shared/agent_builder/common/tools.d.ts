import type { ToolType } from '@kbn/agent-builder-common';
export interface ToolTypeInfo {
    /**
     * The type of the tool.
     */
    type: ToolType;
    /**
     * If the tool can be created in the UI.
     */
    create: boolean;
}
