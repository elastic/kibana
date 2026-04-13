export type StepsProcessingSummaryMap = Map<string, StepProcessingStatus>;
type StepProcessingStatus = 'pending' | 'running' | 'failed' | 'successful' | 'disabled.processorBeforePersisted' | 'skipped.followsProcessorBeingEdited' | 'skipped.excludedByFilteringCondition' | 'skipped.createdInPreviousSimulation' | 'condition';
export declare const useStepsProcessingSummary: () => StepsProcessingSummaryMap;
export {};
