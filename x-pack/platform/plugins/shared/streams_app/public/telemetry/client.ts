/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import {
  StreamsAIGrokSuggestionAcceptedProps,
  StreamsAIGrokSuggestionLatencyProps,
  StreamsAssetClickEventProps,
  StreamsAssetCountProps,
} from './types';
import {
  STREAMS_AI_GROK_SUGGESTION_ACCEPTED_EVENT_TYPE,
  STREAMS_AI_GROK_SUGGESTION_LATENCY_EVENT_TYPE,
  STREAMS_ASSET_CLICK_EVENT_TYPE,
  STREAMS_ASSET_COUNT_EVENT_TYPE,
} from './constants';

export class StreamsTelemetryClient {
  constructor(private readonly analytics: AnalyticsServiceSetup) {}

  public trackAssetCounts(params: StreamsAssetCountProps) {
    this.analytics.reportEvent(STREAMS_ASSET_COUNT_EVENT_TYPE, params);
  }

  public trackAssetClick(params: StreamsAssetClickEventProps) {
    this.analytics.reportEvent(STREAMS_ASSET_CLICK_EVENT_TYPE, params);
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
}
