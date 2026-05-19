import type { RunContext, RunAgentStackEntry } from './runner';
/**
 * Returns the most recent agent entry from a run context stack, if any.
 */
export declare const getAgentFromRunContext: (context: RunContext) => RunAgentStackEntry | undefined;
