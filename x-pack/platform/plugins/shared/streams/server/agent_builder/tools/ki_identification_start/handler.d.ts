import type { KibanaRequest } from '@kbn/core/server';
import type { OnboardingStep } from '@kbn/streams-schema';
import type { TaskClient } from '../../../lib/tasks/task_client';
import type { StreamsTaskType } from '../../../lib/tasks/task_definitions';
interface StartKiIdentificationHandlerParams {
    streamName: string;
    steps: OnboardingStep[];
    connectors?: {
        features?: string;
        queries?: string;
    };
    taskClient: TaskClient<StreamsTaskType>;
    request: KibanaRequest;
}
interface StartKiIdentificationHandlerResult {
    kibanaPath: string;
}
export declare function startKiIdentificationToolHandler({ streamName, steps, connectors, taskClient, request, }: StartKiIdentificationHandlerParams): Promise<StartKiIdentificationHandlerResult>;
export {};
