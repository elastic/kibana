import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { ToastsStart } from '@kbn/core-notifications-browser';
export interface BrowserToolCall {
    tool_id: string;
    call_id: string;
    params: unknown;
    timestamp: number;
}
export declare class BrowserToolExecutor {
    private toasts?;
    constructor(toasts?: ToastsStart);
    /**
     * Execute browser tool calls, tracking which have already been executed
     * to prevent re-execution on history load
     */
    executeToolCalls(calls: BrowserToolCall[], tools: Map<string, BrowserApiToolDefinition<any>>): Promise<void>;
}
