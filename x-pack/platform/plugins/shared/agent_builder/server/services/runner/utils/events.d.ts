import type { AgentEventEmitter, RunAgentOnEventFn, RunContext, ToolEventEmitter, ToolEventHandlerFn } from '@kbn/agent-builder-server';
/**
 * Creates a run event emitter sending events to the provided event handler.
 */
export declare const createAgentEventEmitter: ({ eventHandler, context, }: {
    eventHandler: RunAgentOnEventFn | undefined;
    context: RunContext;
}) => AgentEventEmitter;
/**
 * Creates a run event emitter sending events to the provided event handler.
 */
export declare const createToolEventEmitter: ({ eventHandler, context, }: {
    eventHandler: ToolEventHandlerFn | undefined;
    context: RunContext;
}) => ToolEventEmitter;
