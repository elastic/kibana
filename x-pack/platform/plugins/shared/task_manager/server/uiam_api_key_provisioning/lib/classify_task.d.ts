import type { ConcreteTaskInstance } from '../../task';
import type { ApiKeyToConvert } from '../types';
import { type TaskUiamProvisioningStatusDoc } from './task_uiam_provisioning_observability_status';
/**
 * Task document for UIAM provisioning classification
 * (mirrors {@link RuleForClassification} in `alerting/.../fetch_first_batch.ts`).
 */
export type TaskForClassification = ConcreteTaskInstance;
export type ClassifyTaskResult = {
    action: 'skip';
    status: TaskUiamProvisioningStatusDoc;
} | {
    action: 'convert';
    task: ApiKeyToConvert;
};
/**
 * Classifies a task as either skip (with status doc) or convert (with API key payload + instance for merge).
 * Skip: no API key, already has UIAM key, user-created key, or unusable userScope.
 * Convert: system-generated API key, no UIAM key yet, usable userScope.
 */
export declare const classifyTaskForUiamProvisioning: (task: TaskForClassification) => ClassifyTaskResult;
export interface ClassifyTasksResult {
    provisioningStatusForSkippedTasks: TaskUiamProvisioningStatusDoc[];
    apiKeysToConvert: ApiKeyToConvert[];
}
/**
 * Classifies a batch of tasks into skipped (with status docs) and to-convert payloads.
 * Mirrors `classifyRulesForUiamProvisioning` in `alerting/.../classify_rule.ts`.
 */
export declare const classifyTasksForUiamProvisioning: (tasks: TaskForClassification[]) => ClassifyTasksResult;
