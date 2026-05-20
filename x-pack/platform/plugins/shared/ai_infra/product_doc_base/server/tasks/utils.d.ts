import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare const getTaskStatus: ({ taskManager, taskId, }: {
    taskManager: TaskManagerStartContract;
    taskId: string;
}) => Promise<import("@kbn/task-manager-plugin/server").TaskStatus | "not_scheduled">;
export declare const isTaskCurrentlyRunningError: (err: Error) => boolean;
export declare const waitUntilTaskCompleted: ({ taskManager, taskId, timeout, interval, }: {
    taskManager: TaskManagerStartContract;
    taskId: string;
    timeout?: number;
    interval?: number;
}) => Promise<void>;
