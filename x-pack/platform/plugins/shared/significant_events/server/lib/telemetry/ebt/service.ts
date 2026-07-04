/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import {
  agentBuilderKnowledgeIndicatorCreatedEventType,
  agentToolEventCreateEventType,
  agentToolEventInvestigationAttachEventType,
  agentToolEventStatusUpdateEventType,
  agentToolKiIdentificationStartedEventType,
  codeAnalysisGroundingEventType,
  detectionScanEventType,
  discoveryTriggeredEventType,
  endpointLatencyEventType,
  knowledgeIndicatorEventsGeneratedEventType,
  knowledgeIndicatorFeaturesIdentifiedEventType,
  onboardingScheduledEventType,
} from './events';
import { EbtTelemetryClient } from './client';

export class EbtTelemetryService {
  private analytics?: AnalyticsServiceSetup;

  constructor() {}

  public setup(analytics: AnalyticsServiceSetup) {
    this.analytics = analytics;
    this.analytics.registerEventType(endpointLatencyEventType);

    this.analytics.registerEventType(knowledgeIndicatorEventsGeneratedEventType);
    this.analytics.registerEventType(knowledgeIndicatorFeaturesIdentifiedEventType);
    this.analytics.registerEventType(agentBuilderKnowledgeIndicatorCreatedEventType);
    this.analytics.registerEventType(agentToolKiIdentificationStartedEventType);
    this.analytics.registerEventType(agentToolEventCreateEventType);
    this.analytics.registerEventType(agentToolEventStatusUpdateEventType);
    this.analytics.registerEventType(agentToolEventInvestigationAttachEventType);
    this.analytics.registerEventType(codeAnalysisGroundingEventType);
    this.analytics.registerEventType(discoveryTriggeredEventType);
    this.analytics.registerEventType(detectionScanEventType);
    this.analytics.registerEventType(onboardingScheduledEventType);
  }

  public getClient() {
    if (!this.analytics) {
      throw new Error('Analytics service is not available.');
    }
    return new EbtTelemetryClient(this.analytics);
  }
}
