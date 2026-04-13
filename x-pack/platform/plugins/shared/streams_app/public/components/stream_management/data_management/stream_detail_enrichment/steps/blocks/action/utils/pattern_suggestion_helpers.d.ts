import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { FlattenRecord } from '@kbn/streams-schema';
import type { PreviewDocsFilterOption, SampleDocumentWithUIAttributes } from '../../../../state_management/simulation_state_machine';
/**
 * Prepares samples for pattern extraction by:
 * 1. Flattening original samples
 * 2. Optionally running partial simulation if there are previous processing steps
 * 3. Applying preview document filters
 */
export declare function prepareSamplesForPatternExtraction(originalSamples: SampleDocumentWithUIAttributes[], stepsWithoutCurrent: StreamlangStepWithUIAttributes[], previewDocsFilter: PreviewDocsFilterOption, streamsRepositoryClient: StreamsRepositoryClient, streamName: string): Promise<FlattenRecord[]>;
/**
 * Extracts string messages from a specific field in the samples.
 * Filters out non-string values.
 */
export declare function extractMessagesFromField(samples: FlattenRecord[], fieldName: string): string[];
/**
 * Custom hook that provides common dependencies needed for pattern suggestions.
 * Returns Kibana services, abort controller, and simulator state.
 */
export declare function usePatternSuggestionDependencies(): {
    notifications: import("@kbn/core/public").NotificationsStart;
    telemetryClient: import("../../../../../../../telemetry/client").StreamsTelemetryClient;
    streamsRepositoryClient: StreamsRepositoryClient;
    stepsWithoutCurrent: StreamlangStepWithUIAttributes[];
    previewDocsFilter: "outcome_filter_all" | "outcome_filter_parsed" | "outcome_filter_partially_parsed" | "outcome_filter_skipped" | "outcome_filter_failed" | "outcome_filter_dropped";
    originalSamples: SampleDocumentWithUIAttributes[];
};
