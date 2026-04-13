import { TaskStatus } from '@kbn/streams-schema';
interface TaskWithStatus {
    status: TaskStatus;
}
interface UseTaskPollingParams {
    task: TaskWithStatus | undefined;
    onPoll: () => Promise<TaskWithStatus>;
    onRefresh: () => void | Promise<unknown>;
    onCancel?: () => Promise<unknown>;
    pollIntervalMs?: number;
}
export declare function useTaskPolling({ task, onPoll, onRefresh, onCancel, pollIntervalMs, }: UseTaskPollingParams): {
    cancelTask: () => Promise<void>;
    isCancellingTask: boolean;
};
export {};
