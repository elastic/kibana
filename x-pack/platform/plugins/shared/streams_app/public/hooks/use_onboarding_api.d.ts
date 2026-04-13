export interface UseOnboardingApiOptions {
    connectorId?: string;
    saveQueries?: boolean;
}
export declare function useOnboardingApi({ connectorId, saveQueries }: UseOnboardingApiOptions): {
    scheduleOnboardingTask: (streamName: string) => Promise<import("../../../streams/server/routes/internal/streams/onboarding/route").OnboardingTaskResult>;
    getOnboardingTaskStatus: (streamName: string) => Promise<import("../../../streams/server/routes/internal/streams/onboarding/route").OnboardingTaskResult>;
    cancelOnboardingTask: (streamName: string) => Promise<void>;
    acknowledgeOnboardingTask: (streamName: string) => Promise<void>;
};
