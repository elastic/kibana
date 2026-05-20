import type { IdentifyFeaturesResult } from '../api/features';
import type { SignificantEventsQueriesGenerationResult } from '../api/significant_events';
import type { TaskResult } from '../tasks/types';
export interface OnboardingResult {
    featuresTaskResult?: TaskResult<IdentifyFeaturesResult>;
    queriesTaskResult?: TaskResult<SignificantEventsQueriesGenerationResult>;
}
export declare enum OnboardingStep {
    FeaturesIdentification = "features_identification",
    QueriesGeneration = "queries_generation"
}
