import type { AgentHandlerContext, ScopedRunnerRunAgentParams, RunAgentReturn } from '@kbn/agent-builder-server';
import type { RunnerManager } from './runner';
export declare const createAgentHandlerContext: <TParams = Record<string, unknown>>({ agentExecutionParams, manager, }: {
    agentExecutionParams: ScopedRunnerRunAgentParams;
    manager: RunnerManager;
}) => Promise<AgentHandlerContext>;
export declare const runAgent: ({ agentExecutionParams, parentManager, }: {
    agentExecutionParams: ScopedRunnerRunAgentParams;
    parentManager: RunnerManager;
}) => Promise<RunAgentReturn>;
