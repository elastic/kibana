import type { Logger } from '@kbn/core/server';
import type { TaskStore } from '../task_store';
export declare const MAX_TASKS_TO_RESET = 10000;
interface ResetInFlightTasksOpts {
    logger: Logger;
    taskStore: TaskStore;
}
/**
 * Resets tasks that are still marked as owned by this Kibana node from a
 * previous run (e.g. after a crash or unclean shutdown) so they become
 * immediately claimable, instead of remaining unavailable until their
 * `retryAt` timeout expires.
 *
 * Best-effort: never rejects. On failure the error is logged and the normal
 * `retryAt` timeout path remains the safety net.
 */
export declare function resetInFlightTasksOwnedByThisNode({ logger, taskStore, }: ResetInFlightTasksOpts): Promise<void>;
export {};
