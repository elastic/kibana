import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { TaskStatus } from '@kbn/streams-schema';
import type { TaskResult } from '@kbn/streams-schema';
import type { TaskStorageClient } from './storage';
import type { PersistedTask } from './types';
interface TaskRequest<TaskType, TParams extends {}> {
    task: Omit<PersistedTask & {
        type: TaskType;
    }, 'status' | 'created_at' | 'task'>;
    params: TParams;
    request: KibanaRequest;
}
export declare class TaskClient<TaskType extends string> {
    private readonly taskManagerStart;
    private readonly storageClient;
    private readonly logger;
    constructor(taskManagerStart: TaskManagerStartContract, storageClient: TaskStorageClient, logger: Logger);
    get<TParams extends {} = {}, TPayload extends {} = {}>(id: string): Promise<PersistedTask<TParams, TPayload>>;
    /**
     * Gets the task status with stale detection for in-progress tasks.
     * Returns a normalized TaskResult with the appropriate payload for completed tasks.
     */
    getStatus<TParams extends {} = {}, TPayload extends {} = {}>(id: string): Promise<TaskResult<TPayload>>;
    schedule<TParams extends {} = {}>({ task, params, request, }: TaskRequest<TaskType, TParams>): Promise<void>;
    cancel(id: string): Promise<void>;
    acknowledge<TParams extends {} = {}, TPayload extends {} = {}>(id: string): Promise<{
        status: TaskStatus.Acknowledged;
        last_acknowledged_at: string;
        task: {
            params: TParams;
        } & {
            payload: TPayload;
        };
        id: string;
        type: string;
        space: string;
        created_at: string;
        last_completed_at?: string;
        last_canceled_at?: string;
        last_failed_at?: string;
    }>;
    update<TParams extends {} = {}, TPayload extends {} = {}>(task: PersistedTask<TParams, TPayload>): Promise<void>;
    /**
     * Completes a task by updating its status to Completed with the provided payload.
     */
    complete<TParams extends {} = {}, TPayload extends {} = {}>(task: PersistedTask, params: TParams, payload: TPayload): Promise<void>;
    /**
     * Fails a task by updating its status to Failed with the provided error message.
     */
    fail<TParams extends {} = {}, TPayload extends {} = {}>(task: PersistedTask, params: TParams, error: string, payload?: TPayload): Promise<void>;
    /**
     * Marks a task as canceled after it has been aborted.
     */
    markCanceled(task: PersistedTask): Promise<void>;
    /**
     * Finds all tasks of a given type from the task index.
     * Returns up to 10,000 results; silently truncates beyond that.
     */
    findByType<TParams extends {} = {}, TPayload extends {} = {}>(type: string, options?: {
        sort?: estypes.Sort;
    }): Promise<Array<PersistedTask<TParams, TPayload>>>;
    /**
     * Lists all tasks from the task index.
     * Returns up to 10,000 tasks with only id and created_at fields.
     */
    list(): Promise<Array<{
        id: string;
        created_at: string;
    }>>;
    /**
     * Deletes a single task by ID.
     * @throws TaskNotFoundError if the task does not exist
     */
    deleteTask(id: string): Promise<void>;
    /**
     * Requests cancellation for all in-progress tasks of a given type.
     * Sets each to BeingCanceled; the cancellable-task wrapper handles actual abort.
     * @returns the IDs of tasks that were set to BeingCanceled
     */
    cancelByType(type: string): Promise<string[]>;
}
export {};
