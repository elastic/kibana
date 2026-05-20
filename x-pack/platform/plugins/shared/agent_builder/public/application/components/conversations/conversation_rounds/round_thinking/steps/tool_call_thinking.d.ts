import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { ReactNode } from 'react';
type ItemFactory = (icon?: ReactNode, textColor?: string) => ReactNode;
export interface ItemFactoryEntry {
    key: string;
    factory: ItemFactory;
    isExecuting?: boolean;
}
/**
 * Build thinking item factories for a tool call step.
 * Dispatches to custom renderers for known tools, falls back to the default renderer.
 */
export declare const getToolCallThinkingItems: ({ step, stepIndex, openFlyout, }: {
    step: ToolCallStep;
    stepIndex: number;
    openFlyout: (results: ToolResult[]) => void;
}) => ItemFactoryEntry[];
export {};
