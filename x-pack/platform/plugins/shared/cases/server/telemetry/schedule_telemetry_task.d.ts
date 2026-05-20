import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare const scheduleCasesTelemetryTask: (taskManager: TaskManagerStartContract, logger: Logger) => void;
