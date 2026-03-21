import type { RunToolReturn, ToolHandlerContext } from '@kbn/agent-builder-server';
import type { ScopedRunnerRunToolsParams, ScopedRunnerRunInternalToolParams } from '@kbn/agent-builder-server/runner';
import type { RunnerManager } from './runner';
export declare const runTool: <TParams = Record<string, unknown>>({ toolExecutionParams, parentManager, }: {
    toolExecutionParams: ScopedRunnerRunToolsParams<TParams>;
    parentManager: RunnerManager;
}) => Promise<RunToolReturn>;
export declare const runInternalTool: <TParams = Record<string, unknown>>({ toolExecutionParams, parentManager, }: {
    toolExecutionParams: ScopedRunnerRunInternalToolParams<TParams>;
    parentManager: RunnerManager;
}) => Promise<RunToolReturn>;
export declare const createToolHandlerContext: <TParams = Record<string, unknown>>({ manager, toolExecutionParams, }: {
    toolExecutionParams: ScopedRunnerRunToolsParams<TParams>;
    manager: RunnerManager;
}) => Promise<ToolHandlerContext>;
