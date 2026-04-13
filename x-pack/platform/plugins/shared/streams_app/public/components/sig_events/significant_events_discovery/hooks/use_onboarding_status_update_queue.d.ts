import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
type StreamOnboardingStatusUpdateCallback = (streamName: string, status: TaskResult<OnboardingResult>) => void;
export declare function useOnboardingStatusUpdateQueue(onStreamStatusUpdate: StreamOnboardingStatusUpdateCallback): {
    onboardingStatusUpdateQueue: Set<string>;
    processStatusUpdateQueue: () => Promise<void>;
};
export {};
