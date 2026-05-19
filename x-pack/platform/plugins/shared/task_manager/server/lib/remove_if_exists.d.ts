import type { TaskStore } from '../task_store';
/**
 * Removes a task from the store, ignoring a not found error
 * Other errors are re-thrown
 *
 * @param taskStore
 * @param taskId
 */
export declare function removeIfExists(taskStore: TaskStore, taskId: string): Promise<void>;
