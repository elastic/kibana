import React from 'react';
import type { ToolResult as ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
interface ToolResultProps {
    result: ToolResultType;
}
export declare const ToolResult: React.FC<ToolResultProps>;
export declare const isInlineRenderableResult: (result: ToolResultType) => boolean;
export {};
