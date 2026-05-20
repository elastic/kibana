import type { KibanaRequest } from '@kbn/core/server';
import type { TaskResult } from '@kbn/streams-schema';
import type { TaskClient } from '../../lib/tasks/task_client';
import type { StreamsTaskType } from '../../lib/tasks/task_definitions';
interface ScheduleTaskConfig<TParams extends object> {
    taskType: StreamsTaskType;
    taskId: string;
    params: TParams;
    request: KibanaRequest;
}
interface HandleTaskActionBaseParams {
    taskClient: TaskClient<StreamsTaskType>;
    taskId: string;
}
interface HandleScheduleActionParams<TParams extends object> extends HandleTaskActionBaseParams {
    action: 'schedule';
    scheduleConfig: ScheduleTaskConfig<TParams>;
}
interface HandleCancelOrAcknowledgeActionParams extends HandleTaskActionBaseParams {
    action: 'cancel' | 'acknowledge';
    scheduleConfig?: undefined;
}
type HandleTaskActionParams<TParams extends object> = HandleScheduleActionParams<TParams> | HandleCancelOrAcknowledgeActionParams;
/**
 * Handles task lifecycle actions: schedule, cancel, and acknowledge.
 * Returns the appropriate response based on the action.
 */
export declare function handleTaskAction<TParams extends object, TPayload extends object>(params: HandleTaskActionParams<TParams>): Promise<TaskResult<TPayload>>;
export {};
