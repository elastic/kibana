declare const streamsEndpointLatencyEventType: {
    eventType: string;
    schema: {
        name: import("@elastic/ebt").SchemaValue<string>;
        endpoint: import("@elastic/ebt").SchemaValue<string>;
        duration_ms: import("@elastic/ebt").SchemaValue<number>;
    };
};
declare const streamsStateErrorEventType: {
    eventType: string;
    schema: {
        error: import("@elastic/ebt").SchemaValue<{
            name: string;
            message: string;
            stack_trace?: string;
        }>;
        status_code: import("@elastic/ebt").SchemaValue<number>;
    };
};
declare const streamsDescriptionGeneratedEventType: {
    eventType: string;
    schema: {
        input_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        output_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        stream_type: import("@elastic/ebt").SchemaValue<import("@kbn/streams-schema").StreamType>;
    };
};
declare const streamsSignificantEventsGeneratedEventType: {
    eventType: string;
    schema: {
        count: import("@elastic/ebt").SchemaValue<number>;
        input_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        output_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        stream_type: import("@elastic/ebt").SchemaValue<import("@kbn/streams-schema").StreamType>;
        tool_usage: import("@elastic/ebt").SchemaValue<import("@kbn/streams-ai").SignificantEventsToolUsage>;
    };
};
declare const streamsInsightsGeneratedEventType: {
    eventType: string;
    schema: {
        input_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        output_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        cached_tokens_used: import("@elastic/ebt").SchemaValue<number | undefined>;
    };
};
declare const streamsProcessingPipelineSuggestedEventType: {
    eventType: string;
    schema: {
        duration_ms: import("@elastic/ebt").SchemaValue<number>;
        steps_used: import("@elastic/ebt").SchemaValue<number>;
        success: import("@elastic/ebt").SchemaValue<boolean>;
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        stream_type: import("@elastic/ebt").SchemaValue<import("@kbn/streams-schema").StreamType>;
    };
};
declare const streamsFeaturesIdentifiedEventType: {
    eventType: string;
    schema: {
        run_id: import("@elastic/ebt").SchemaValue<string>;
        iteration: import("@elastic/ebt").SchemaValue<number>;
        docs_count: import("@elastic/ebt").SchemaValue<number>;
        features_new: import("@elastic/ebt").SchemaValue<number>;
        features_updated: import("@elastic/ebt").SchemaValue<number>;
        total_filters: import("@elastic/ebt").SchemaValue<number>;
        filters_capped: import("@elastic/ebt").SchemaValue<boolean>;
        has_filtered_documents: import("@elastic/ebt").SchemaValue<boolean>;
        input_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        output_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        total_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        cached_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        duration_ms: import("@elastic/ebt").SchemaValue<number>;
        excluded_features_count: import("@elastic/ebt").SchemaValue<number>;
        llm_ignored_count: import("@elastic/ebt").SchemaValue<number>;
        code_ignored_count: import("@elastic/ebt").SchemaValue<number>;
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        stream_type: import("@elastic/ebt").SchemaValue<import("@kbn/streams-schema").StreamType>;
        state: import("@elastic/ebt").SchemaValue<"success" | "canceled" | "failure">;
    };
};
declare const streamsAgentBuilderKnowledgeIndicatorCreatedEventType: {
    eventType: string;
    schema: {
        ki_kind: import("@elastic/ebt").SchemaValue<"query" | "feature">;
        tool_id: import("@elastic/ebt").SchemaValue<"ki_feature_create" | "ki_query_create">;
        success: import("@elastic/ebt").SchemaValue<boolean>;
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        stream_type: import("@elastic/ebt").SchemaValue<import("@kbn/streams-schema").StreamType>;
        error_message: import("@elastic/ebt").SchemaValue<string | undefined>;
    };
};
declare const streamsAgentToolKiIdentificationStartedEventType: {
    eventType: string;
    schema: {
        success: import("@elastic/ebt").SchemaValue<boolean>;
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        error_message: import("@elastic/ebt").SchemaValue<string | undefined>;
    };
};
export { streamsEndpointLatencyEventType, streamsStateErrorEventType, streamsDescriptionGeneratedEventType, streamsSignificantEventsGeneratedEventType, streamsInsightsGeneratedEventType, streamsProcessingPipelineSuggestedEventType, streamsFeaturesIdentifiedEventType, streamsAgentBuilderKnowledgeIndicatorCreatedEventType, streamsAgentToolKiIdentificationStartedEventType, };
