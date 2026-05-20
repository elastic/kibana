import type { TaskStatus } from '@kbn/streams-schema';
interface PersistedTaskBase<TParams extends {} = {}> {
    id: string;
    type: string;
    status: Exclude<TaskStatus, TaskStatus.Stale>;
    space: string;
    created_at: string;
    last_completed_at?: string;
    last_acknowledged_at?: string;
    last_canceled_at?: string;
    last_failed_at?: string;
    task: {
        params: TParams;
    };
}
interface NotStartedTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
    status: TaskStatus.NotStarted;
}
interface InProgressTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
    status: TaskStatus.InProgress;
}
interface BeingCanceledTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
    status: TaskStatus.BeingCanceled;
}
interface CanceledTask<TParams extends {} = {}> extends PersistedTaskBase<TParams> {
    status: TaskStatus.Canceled;
}
interface CompletedTask<TParams extends {} = {}, TPayload extends {} = {}> extends PersistedTaskBase<TParams> {
    status: TaskStatus.Completed;
    task: PersistedTaskBase<TParams>['task'] & {
        payload: TPayload;
    };
}
interface AcknowledgedTask<TParams extends {} = {}, TPayload extends {} = {}> extends PersistedTaskBase<TParams> {
    status: TaskStatus.Acknowledged;
    task: PersistedTaskBase<TParams>['task'] & {
        payload: TPayload;
    };
}
interface FailedTask<TParams extends {} = {}, TPayload extends {} = {}> extends PersistedTaskBase<TParams> {
    status: TaskStatus.Failed;
    task: PersistedTaskBase<TParams>['task'] & {
        error: string;
        payload?: TPayload;
    };
}
export type PersistedTask<TParams extends {} = {}, TPayload extends {} = {}> = NotStartedTask<TParams> | InProgressTask<TParams> | CompletedTask<TParams, TPayload> | AcknowledgedTask<TParams, TPayload> | FailedTask<TParams, TPayload> | BeingCanceledTask<TParams> | CanceledTask<TParams>;
export type TaskParams<TParams extends {} = {}> = TParams & {
    _task: PersistedTask;
};
export {};
