/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type {
  AgentBuilderKnowledgeIndicatorCreatedProps,
  AgentToolEventCreateProps,
  AgentToolEventInvestigationAttachProps,
  AgentToolEventStatusUpdateProps,
  AgentToolKnowledgeIndicatorIdentificationStartedProps,
  CodeAnalysisGroundingProps,
  EndpointLatencyProps,
  KnowledgeIndicatorFeaturesIdentifiedProps,
  KnowledgeIndicatorQueriesGeneratedProps,
  KnowledgeIndicatorOnboardingScheduledProps,
  DetectionScanProps,
  DiscoveryTriggeredProps,
} from './types';
import {
  SIGNIFICANT_EVENTS_ENDPOINT_LATENCY_EVENT,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_FEATURES_IDENTIFIED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_KI_IDENTIFICATION_STARTED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_STATUS_UPDATE_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_INVESTIGATION_ATTACH_EVENT_TYPE,
  SIGNIFICANT_EVENTS_CODE_ANALYSIS_GROUNDING_EVENT_TYPE,
  SIGNIFICANT_EVENTS_DISCOVERY_TRIGGERED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_DETECTION_SCAN_EVENT_TYPE,
  SIGNIFICANT_EVENTS_ONBOARDING_SCHEDULED_EVENT_TYPE,
} from './constants';

const LATENCY_TRACKING_ENDPOINT_ALLOW_LIST: string[] = [];

export class EbtTelemetryClient {
  constructor(private readonly analytics: AnalyticsServiceSetup) {}

  public startTrackingEndpointLatency(props: Pick<EndpointLatencyProps, 'name' | 'endpoint'>) {
    if (!LATENCY_TRACKING_ENDPOINT_ALLOW_LIST.includes(props.endpoint)) {
      return () => {};
    }
    const startTime = Date.now();
    return () => {
      this.analytics.reportEvent(SIGNIFICANT_EVENTS_ENDPOINT_LATENCY_EVENT, {
        ...props,
        duration_ms: Date.now() - startTime,
      });
    };
  }

  public trackSignificantEventsQueriesGenerated(params: KnowledgeIndicatorQueriesGeneratedProps) {
    this.analytics.reportEvent(
      SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
      params
    );
  }

  public trackFeaturesIdentified(params: KnowledgeIndicatorFeaturesIdentifiedProps) {
    this.analytics.reportEvent(SIGNIFICANT_EVENTS_FEATURES_IDENTIFIED_EVENT_TYPE, params);
  }

  public trackAgentBuilderKnowledgeIndicatorCreated(
    params: AgentBuilderKnowledgeIndicatorCreatedProps
  ) {
    this.analytics.reportEvent(
      SIGNIFICANT_EVENTS_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
      params
    );
  }

  public trackAgentToolKiIdentificationStarted(
    params: AgentToolKnowledgeIndicatorIdentificationStartedProps
  ) {
    this.analytics.reportEvent(
      SIGNIFICANT_EVENTS_AGENT_TOOL_KI_IDENTIFICATION_STARTED_EVENT_TYPE,
      params
    );
  }

  public trackAgentToolEventCreate(params: AgentToolEventCreateProps) {
    this.analytics.reportEvent(SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE, params);
  }

  public trackAgentToolEventStatusUpdate(params: AgentToolEventStatusUpdateProps) {
    this.analytics.reportEvent(
      SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_STATUS_UPDATE_EVENT_TYPE,
      params
    );
  }

  public trackAgentToolEventInvestigationAttach(params: AgentToolEventInvestigationAttachProps) {
    this.analytics.reportEvent(
      SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_INVESTIGATION_ATTACH_EVENT_TYPE,
      params
    );
  }

  public trackCodeAnalysisGrounding(params: CodeAnalysisGroundingProps) {
    this.analytics.reportEvent(SIGNIFICANT_EVENTS_CODE_ANALYSIS_GROUNDING_EVENT_TYPE, params);
  }

  public trackSignificantEventsDiscoveryTriggered(params: DiscoveryTriggeredProps) {
    this.analytics.reportEvent(SIGNIFICANT_EVENTS_DISCOVERY_TRIGGERED_EVENT_TYPE, params);
  }

  public trackOnboardingScheduled(params: KnowledgeIndicatorOnboardingScheduledProps) {
    this.analytics.reportEvent(SIGNIFICANT_EVENTS_ONBOARDING_SCHEDULED_EVENT_TYPE, params);
  }

  public trackSignificantEventsDetectionScan(params: DetectionScanProps) {
    this.analytics.reportEvent(SIGNIFICANT_EVENTS_DETECTION_SCAN_EVENT_TYPE, params);
  }
}
