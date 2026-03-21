import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { TaskHandler } from './task_handler';
export declare const taskTypes: {
    readonly runAgent: "agent-builder:run-agent";
};
export interface RunAgentTaskParams {
    executionId: string;
}
/**
 * Register agent builder task definitions with task manager.
 * Must be called during plugin setup.
 */
export declare const registerTaskDefinitions: ({ taskManager, getTaskHandler, }: {
    taskManager: TaskManagerSetupContract;
    getTaskHandler: () => TaskHandler;
}) => void;
