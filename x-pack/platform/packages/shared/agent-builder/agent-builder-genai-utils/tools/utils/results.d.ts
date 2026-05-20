import type { ToolHandlerResult } from '@kbn/agent-builder-server/tools';
export declare const errorResult: (error: string) => ToolHandlerResult;
export declare const otherResult: (data: Record<string, unknown>) => ToolHandlerResult;
