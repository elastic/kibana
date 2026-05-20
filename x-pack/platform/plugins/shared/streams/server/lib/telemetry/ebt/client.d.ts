import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { StreamEndpointLatencyProps, StreamsDescriptionGeneratedProps, StreamsInsightsGeneratedProps, StreamsSignificantEventsQueriesGeneratedProps, StreamsProcessingPipelineSuggestedProps, StreamsFeaturesIdentifiedProps, StreamsAgentBuilderKnowledgeIndicatorCreatedProps, StreamsAgentToolKiIdentificationStartedProps } from './types';
export declare class EbtTelemetryClient {
    private readonly analytics;
    constructor(analytics: AnalyticsServiceSetup);
    startTrackingEndpointLatency(props: Pick<StreamEndpointLatencyProps, 'name' | 'endpoint'>): () => void;
    reportStreamsStateError(error: Error & {
        statusCode: number;
    }): void;
    trackDescriptionGenerated(params: StreamsDescriptionGeneratedProps): void;
    trackSignificantEventsQueriesGenerated(params: StreamsSignificantEventsQueriesGeneratedProps): void;
    trackInsightsGenerated(params: StreamsInsightsGeneratedProps): void;
    trackProcessingPipelineSuggested(params: StreamsProcessingPipelineSuggestedProps): void;
    trackFeaturesIdentified(params: StreamsFeaturesIdentifiedProps): void;
    trackAgentBuilderKnowledgeIndicatorCreated(params: StreamsAgentBuilderKnowledgeIndicatorCreatedProps): void;
    trackAgentToolKiIdentificationStarted(params: StreamsAgentToolKiIdentificationStartedProps): void;
}
