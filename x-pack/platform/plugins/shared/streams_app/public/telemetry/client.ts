/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import type {
  StreamsAIGrokSuggestionAcceptedProps,
  StreamsAIGrokSuggestionLatencyProps,
  StreamsAIDissectSuggestionAcceptedProps,
  StreamsAIDissectSuggestionLatencyProps,
  StreamsAttachmentClickEventProps,
  StreamsAttachmentCountProps,
  StreamsChildStreamCreatedProps,
  StreamsProcessingSavedProps,
  StreamsSchemaUpdatedProps,
  StreamsSignificantEventsCreatedProps,
  StreamsSignificantEventsSuggestionsGeneratedEventProps,
  WiredStreamsStatusChangedProps,
} from './types';
import {
  STREAMS_AI_GROK_SUGGESTION_ACCEPTED_EVENT_TYPE,
  STREAMS_AI_GROK_SUGGESTION_LATENCY_EVENT_TYPE,
  STREAMS_AI_DISSECT_SUGGESTION_ACCEPTED_EVENT_TYPE,
  STREAMS_AI_DISSECT_SUGGESTION_LATENCY_EVENT_TYPE,
  STREAMS_ATTACHMENT_CLICK_EVENT_TYPE,
  STREAMS_ATTACHMENT_COUNT_EVENT_TYPE,
  STREAMS_CHILD_STREAM_CREATED_EVENT_TYPE,
  STREAMS_PROCESSING_SAVED_EVENT_TYPE,
  STREAMS_RETENTION_CHANGED_EVENT_TYPE,
  STREAMS_SCHEMA_UPDATED_EVENT_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_CREATED_EVENT_TYPE,
  STREAMS_SIGNIFICANT_EVENTS_SUGGESTIONS_GENERATED_EVENT_TYPE,
  STREAMS_WIRED_STREAMS_STATUS_CHANGED_EVENT_TYPE,
} from './constants';

export class StreamsTelemetryClient {
  constructor(private readonly analytics: AnalyticsServiceSetup) {}

  public trackAttachmentCounts(params: StreamsAttachmentCountProps) {
    this.analytics.reportEvent(STREAMS_ATTACHMENT_COUNT_EVENT_TYPE, params);
  }

  public trackAttachmentClick(params: StreamsAttachmentClickEventProps) {
    this.analytics.reportEvent(STREAMS_ATTACHMENT_CLICK_EVENT_TYPE, params);
  }

  public startTrackingAIGrokSuggestionLatency(
    params: Pick<StreamsAIGrokSuggestionLatencyProps, 'name' | 'field' | 'connector_id'>
  ) {
    const start = Date.now();
    return (count: number, rates: number[]) => {
      this.analytics.reportEvent(STREAMS_AI_GROK_SUGGESTION_LATENCY_EVENT_TYPE, {
        ...params,
        duration_ms: Date.now() - start,
        suggestion_count: count,
        match_rate: rates,
      });
    };
  }

  public trackAIGrokSuggestionAccepted(params: StreamsAIGrokSuggestionAcceptedProps) {
    this.analytics.reportEvent(STREAMS_AI_GROK_SUGGESTION_ACCEPTED_EVENT_TYPE, params);
  }

  public startTrackingAIDissectSuggestionLatency(
    params: Pick<StreamsAIDissectSuggestionLatencyProps, 'name' | 'field' | 'connector_id'>
  ) {
    const start = Date.now();
    return (count: number, rates: number[]) => {
      this.analytics.reportEvent(STREAMS_AI_DISSECT_SUGGESTION_LATENCY_EVENT_TYPE, {
        ...params,
        duration_ms: Date.now() - start,
        suggestion_count: count,
        match_rate: rates,
      });
    };
  }

  public trackAIDissectSuggestionAccepted(params: StreamsAIDissectSuggestionAcceptedProps) {
    this.analytics.reportEvent(STREAMS_AI_DISSECT_SUGGESTION_ACCEPTED_EVENT_TYPE, params);
  }

  public trackWiredStreamsStatusChanged(params: WiredStreamsStatusChangedProps) {
    this.analytics.reportEvent(STREAMS_WIRED_STREAMS_STATUS_CHANGED_EVENT_TYPE, params);
  }

  public trackProcessingSaved(params: StreamsProcessingSavedProps) {
    this.analytics.reportEvent(STREAMS_PROCESSING_SAVED_EVENT_TYPE, params);
  }

  public trackRetentionChanged(lifecycle: IngestStreamLifecycle, streamType: string) {
    this.analytics.reportEvent(STREAMS_RETENTION_CHANGED_EVENT_TYPE, {
      lifecycle_type: this.getLifecycleType(lifecycle),
      lifecycle_value: this.getLifecycleValue(lifecycle),
      stream_type: streamType,
    });
  }

  public trackChildStreamCreated(props: StreamsChildStreamCreatedProps) {
    this.analytics.reportEvent(STREAMS_CHILD_STREAM_CREATED_EVENT_TYPE, props);
  }

  public trackSchemaUpdated(props: StreamsSchemaUpdatedProps) {
    this.analytics.reportEvent(STREAMS_SCHEMA_UPDATED_EVENT_TYPE, props);
  }

  public trackSignificantEventsSuggestionsGenerate(
    params: StreamsSignificantEventsSuggestionsGeneratedEventProps
  ) {
    this.analytics.reportEvent(STREAMS_SIGNIFICANT_EVENTS_SUGGESTIONS_GENERATED_EVENT_TYPE, params);
  }

  public trackSignificantEventsCreated(params: StreamsSignificantEventsCreatedProps) {
    this.analytics.reportEvent(STREAMS_SIGNIFICANT_EVENTS_CREATED_EVENT_TYPE, params);
  }

  private getLifecycleType(lifecycle: IngestStreamLifecycle): 'dsl' | 'ilm' | 'inherit' {
    if ('dsl' in lifecycle) {
      return 'dsl';
    }
    if ('ilm' in lifecycle) {
      return 'ilm';
    }
    return 'inherit';
  }

  private getLifecycleValue(lifecycle: IngestStreamLifecycle): string | undefined {
    if ('dsl' in lifecycle) {
      return lifecycle.dsl.data_retention;
    }
    if ('ilm' in lifecycle) {
      return lifecycle.ilm.policy;
    }
    return undefined;
  }
}
