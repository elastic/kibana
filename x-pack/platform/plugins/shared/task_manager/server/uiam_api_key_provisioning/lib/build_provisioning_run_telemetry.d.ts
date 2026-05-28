import type { TaskManagerUiamProvisioningRunEventData } from '../event_based_telemetry';
export declare const failedProvisioningRunTelemetry: () => TaskManagerUiamProvisioningRunEventData;
/**
 * Shapes run telemetry like Alerting's `UiamProvisioningRunEventData`
 * (`completed` + `failed` + `skipped` = `total`, `has_more_to_provision` from batching).
 */
export declare const buildSuccessProvisioningRunTelemetry: ({ completed, failed, skipped, hasMoreToProvision, nextRunNumber, }: {
    completed: number;
    failed: number;
    skipped: number;
    hasMoreToProvision: boolean;
    nextRunNumber: number;
}) => TaskManagerUiamProvisioningRunEventData;
