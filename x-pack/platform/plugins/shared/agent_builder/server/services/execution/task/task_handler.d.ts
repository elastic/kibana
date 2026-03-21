import type { KibanaRequest } from '@kbn/core-http-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import { type AgentExecutionDeps } from '../execution_runner';
export interface TaskHandlerDeps extends AgentExecutionDeps {
    elasticsearch: ElasticsearchServiceStart;
}
/**
 * The task handler interface used by the task definition.
 */
export interface TaskHandler {
    run(params: {
        executionId: string;
        fakeRequest: KibanaRequest;
    }): Promise<void>;
    cancel(params: {
        executionId: string;
    }): Promise<void>;
}
export declare const createTaskHandler: (deps: TaskHandlerDeps) => TaskHandler;
