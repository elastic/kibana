import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { ExecutionContextSetup } from '@kbn/core/server';
export interface CreateExecutionContextArgs {
    contextSetup: ExecutionContextSetup;
    baseContext: KibanaExecutionContext;
}
export interface ExecutionContextRunner {
    run<T>(fn: () => Promise<T>, context?: KibanaExecutionContext): Promise<T>;
}
export declare class ExecutionContextRunnerImpl implements ExecutionContextRunner {
    private contextSetup;
    private baseContext;
    constructor(args: CreateExecutionContextArgs);
    run<T>(fn: () => Promise<T>, context?: KibanaExecutionContext): Promise<T>;
}
export declare function getExecutionContextRunner(contextSetup: ExecutionContextSetup, baseContext?: KibanaExecutionContext): ExecutionContextRunner;
