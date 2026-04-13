declare const streamsAttachmentCountEventType: {
    eventType: string;
    schema: {
        name: import("@elastic/ebt").SchemaValue<string>;
        rule: import("@elastic/ebt").SchemaValue<number>;
        dashboard: import("@elastic/ebt").SchemaValue<number>;
        slo: import("@elastic/ebt").SchemaValue<number>;
    };
};
declare const streamsAttachmentClickEventType: {
    eventType: string;
    schema: {
        name: import("@elastic/ebt").SchemaValue<string>;
        attachment_type: import("@elastic/ebt").SchemaValue<"rule" | "dashboard" | "slo">;
        attachment_id: import("@elastic/ebt").SchemaValue<string>;
    };
};
declare const streamsAttachmentLinkedEventType: {
    eventType: string;
    schema: {
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        attachment_count: import("@elastic/ebt").SchemaValue<number>;
        count_by_type: import("@elastic/ebt").SchemaValue<Record<"rule" | "dashboard" | "slo", number>>;
    };
};
declare const streamsAttachmentUnlinkedEventType: {
    eventType: string;
    schema: {
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        attachment_count: import("@elastic/ebt").SchemaValue<number>;
        count_by_type: import("@elastic/ebt").SchemaValue<Record<"rule" | "dashboard" | "slo", number>>;
    };
};
declare const streamsAttachmentFlyoutOpenedEventType: {
    eventType: string;
    schema: {
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        attachment_type: import("@elastic/ebt").SchemaValue<"rule" | "dashboard" | "slo">;
        attachment_id: import("@elastic/ebt").SchemaValue<string>;
    };
};
declare const streamsAttachmentFlyoutActionEventType: {
    eventType: string;
    schema: {
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        attachment_type: import("@elastic/ebt").SchemaValue<"rule" | "dashboard" | "slo">;
        attachment_id: import("@elastic/ebt").SchemaValue<string>;
        action: import("@elastic/ebt").SchemaValue<import("./types").AttachmentFlyoutAction>;
    };
};
declare const streamsAIGrokSuggestionAcceptedEventType: {
    eventType: string;
    schema: {
        name: import("@elastic/ebt").SchemaValue<string>;
        field: import("@elastic/ebt").SchemaValue<string>;
        connector_id: import("@elastic/ebt").SchemaValue<string>;
        match_rate: import("@elastic/ebt").SchemaValue<number>;
        detected_fields: import("@elastic/ebt").SchemaValue<number>;
    };
};
declare const streamsAIDissectSuggestionAcceptedEventType: {
    eventType: string;
    schema: {
        name: import("@elastic/ebt").SchemaValue<string>;
        field: import("@elastic/ebt").SchemaValue<string>;
        connector_id: import("@elastic/ebt").SchemaValue<string>;
        match_rate: import("@elastic/ebt").SchemaValue<number>;
        detected_fields: import("@elastic/ebt").SchemaValue<number>;
    };
};
declare const streamsProcessingSavedEventType: {
    eventType: string;
    schema: {
        processors_count: import("@elastic/ebt").SchemaValue<number>;
        stream_type: import("@elastic/ebt").SchemaValue<"query" | "classic" | "wired" | "unknown">;
        configuration_mode: import("@elastic/ebt").SchemaValue<import("./types").ConfigurationMode>;
    };
};
declare const streamsRetentionChangedEventType: {
    eventType: string;
    schema: {
        lifecycle_type: import("@elastic/ebt").SchemaValue<"ilm" | "inherit" | "dsl">;
        lifecycle_value: import("@elastic/ebt").SchemaValue<string | undefined>;
        stream_type: import("@elastic/ebt").SchemaValue<"query" | "classic" | "wired" | "unknown">;
    };
};
declare const streamsChildStreamCreatedEventType: {
    eventType: string;
    schema: {
        name: import("@elastic/ebt").SchemaValue<string>;
    };
};
declare const streamsSchemaUpdatedEventType: {
    eventType: string;
    schema: {
        stream_type: import("@elastic/ebt").SchemaValue<"query" | "classic" | "wired" | "unknown">;
    };
};
declare const streamsSignificantEventsSuggestionsGeneratedEventType: {
    eventType: string;
    schema: {
        duration_ms: import("@elastic/ebt").SchemaValue<number>;
        input_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        output_tokens_used: import("@elastic/ebt").SchemaValue<number>;
        count: import("@elastic/ebt").SchemaValue<number>;
        features_selected: import("@elastic/ebt").SchemaValue<number>;
        features_total: import("@elastic/ebt").SchemaValue<number>;
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        stream_type: import("@elastic/ebt").SchemaValue<"query" | "classic" | "wired" | "unknown">;
    };
};
declare const streamsSignificantEventsCreatedEventType: {
    eventType: string;
    schema: {
        count: import("@elastic/ebt").SchemaValue<number>;
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        stream_type: import("@elastic/ebt").SchemaValue<"query" | "classic" | "wired" | "unknown">;
    };
};
declare const streamsFeatureIdentificationSavedEventType: {
    eventType: string;
    schema: {
        count: import("@elastic/ebt").SchemaValue<number>;
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        stream_type: import("@elastic/ebt").SchemaValue<"query" | "classic" | "wired" | "unknown">;
    };
};
declare const streamsFeatureIdentificationDeletedEventType: {
    eventType: string;
    schema: {
        count: import("@elastic/ebt").SchemaValue<number>;
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        stream_type: import("@elastic/ebt").SchemaValue<"query" | "classic" | "wired" | "unknown">;
    };
};
declare const wiredStreamsStatusChangedEventType: {
    eventType: string;
    schema: {
        is_enabled: import("@elastic/ebt").SchemaValue<boolean>;
    };
};
declare const streamsTabVisitedEventType: {
    eventType: string;
    schema: {
        stream_name: import("@elastic/ebt").SchemaValue<string>;
        stream_type: import("@elastic/ebt").SchemaValue<"query" | "classic" | "wired" | "unknown">;
        tab_name: import("@elastic/ebt").SchemaValue<string>;
        privileges: import("@elastic/ebt").SchemaValue<{
            manage: boolean;
            monitor: boolean;
            view_index_metadata: boolean;
            lifecycle: boolean;
            simulate: boolean;
            text_structure: boolean;
            read_failure_store: boolean;
            manage_failure_store: boolean;
            create_snapshot_repository: boolean;
        }>;
    };
};
export { streamsAttachmentCountEventType, streamsAttachmentClickEventType, streamsAttachmentLinkedEventType, streamsAttachmentUnlinkedEventType, streamsAttachmentFlyoutOpenedEventType, streamsAttachmentFlyoutActionEventType, streamsAIGrokSuggestionAcceptedEventType, streamsAIDissectSuggestionAcceptedEventType, streamsProcessingSavedEventType, streamsRetentionChangedEventType, streamsChildStreamCreatedEventType, streamsSchemaUpdatedEventType, streamsSignificantEventsSuggestionsGeneratedEventType, streamsSignificantEventsCreatedEventType, wiredStreamsStatusChangedEventType, streamsFeatureIdentificationSavedEventType, streamsFeatureIdentificationDeletedEventType, streamsTabVisitedEventType, };
