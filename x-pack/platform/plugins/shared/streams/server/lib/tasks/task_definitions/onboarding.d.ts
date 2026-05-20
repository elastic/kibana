import type { OnboardingStep } from '@kbn/streams-schema';
import type { TaskContext } from '.';
export interface OnboardingTaskParams {
    streamName: string;
    from: number;
    to: number;
    steps: OnboardingStep[];
    connectors?: {
        features?: string;
        queries?: string;
    };
}
export declare const STREAMS_ONBOARDING_TASK_TYPE = "streams_onboarding";
export declare function getOnboardingTaskId(streamName: string): string;
export declare function createStreamsOnboardingTask(taskContext: TaskContext): {
    streams_onboarding: {
        timeout: string;
        createTaskRunner: (runContext: import("@kbn/task-manager-plugin/server").RunContext) => {
            run: () => Promise<import("@kbn/task-manager-plugin/server/task").AnyRunResult>;
        };
    };
};
