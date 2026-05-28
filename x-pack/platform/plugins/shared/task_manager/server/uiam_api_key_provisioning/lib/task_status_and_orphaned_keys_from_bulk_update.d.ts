import type { InvalidationTarget } from '../../api_key_strategy';
import type { UiamKeyResult } from '../types';
import { type TaskUiamProvisioningStatusDoc } from './task_uiam_provisioning_observability_status';
/**
 * Result item from a bulkUpdate call (has id and optional error).
 * Mirrors `BulkUpdateResultItem` in alerting's `provisioning_status.ts`.
 */
export interface TaskBulkUpdateResultItem {
    id: string;
    error?: {
        message?: string;
    };
}
/**
 * Builds status docs from bulk update results and collects invalidation targets for tasks
 * that failed to update (orphaned), shaped like {@link InvalidationTarget} in `api_key_strategy`
 * and Alerting’s notion of “orphan” UIAM material to queue for the invalidate pipeline.
 */
export declare const statusDocsAndOrphanedUiamKeysFromTaskBulkUpdate: (savedObjects: Array<TaskBulkUpdateResultItem>, uiamKeyByTaskId: Map<string, UiamKeyResult>) => {
    provisioningStatusForCompletedTasks: TaskUiamProvisioningStatusDoc[];
    provisioningStatusForFailedTasks: TaskUiamProvisioningStatusDoc[];
    orphanedInvalidationTargets: InvalidationTarget[];
};
