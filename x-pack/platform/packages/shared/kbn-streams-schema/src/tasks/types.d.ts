export declare enum TaskStatus {
    NotStarted = "not_started",
    InProgress = "in_progress",
    Stale = "stale",
    BeingCanceled = "being_canceled",
    Canceled = "canceled",
    Failed = "failed",
    Completed = "completed",
    Acknowledged = "acknowledged"
}
/**
 * Generic result type for task status/actions endpoints.
 * Uses discriminated union based on status to properly type the payload.
 */
export type TaskResult<TPayload> = {
    status: TaskStatus.NotStarted | TaskStatus.InProgress | TaskStatus.Stale | TaskStatus.BeingCanceled | TaskStatus.Canceled;
} | ({
    status: TaskStatus.Failed;
    error: string;
} & Partial<TPayload>) | ({
    status: TaskStatus.Completed;
} & TPayload) | ({
    status: TaskStatus.Acknowledged;
} & TPayload);
