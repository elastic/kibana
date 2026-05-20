import { TaskStatus } from '@kbn/streams-schema';
import type { TaskClient } from '../../../lib/tasks/task_client';
import type { StreamsTaskType } from '../../../lib/tasks/task_definitions';
interface CancelKiIdentificationHandlerParams {
    stream_name: string;
    task_client: TaskClient<StreamsTaskType>;
}
interface CancelKiIdentificationHandlerResult {
    stream_name: string;
    task_id: string;
    status: TaskStatus.BeingCanceled;
}
export declare function cancelKiIdentificationToolHandler({ stream_name: streamName, task_client: taskClient, }: CancelKiIdentificationHandlerParams): Promise<CancelKiIdentificationHandlerResult>;
export {};
