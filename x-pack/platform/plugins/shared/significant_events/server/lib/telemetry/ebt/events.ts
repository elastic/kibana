/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENTS_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_INVESTIGATION_ATTACH_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_STATUS_UPDATE_EVENT_TYPE,
  SIGNIFICANT_EVENTS_AGENT_TOOL_KI_IDENTIFICATION_STARTED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_CODE_ANALYSIS_GROUNDING_EVENT_TYPE,
  SIGNIFICANT_EVENTS_DETECTION_SCAN_EVENT_TYPE,
  SIGNIFICANT_EVENTS_DISCOVERY_TRIGGERED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_ENDPOINT_LATENCY_EVENT,
  SIGNIFICANT_EVENTS_FEATURES_IDENTIFIED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_ONBOARDING_SCHEDULED_EVENT_TYPE,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
} from './constants';
import {
  agentBuilderKnowledgeIndicatorCreatedSchema,
  agentToolEventCreateSchema,
  agentToolEventInvestigationAttachSchema,
  agentToolEventStatusUpdateSchema,
  agentToolKnowledgeIndicatorIdentificationStartedSchema,
  codeAnalysisGroundingSchema,
  detectionScanSchema,
  discoveryTriggeredSchema,
  endpointLatencySchema,
  knowledgeIndicatorFeaturesIdentifiedSchema,
  knowledgeIndicatorQueriesGeneratedSchema,
  onboardingScheduledSchema,
} from './schemas';

const endpointLatencyEventType = {
  eventType: SIGNIFICANT_EVENTS_ENDPOINT_LATENCY_EVENT,
  schema: endpointLatencySchema,
};

const knowledgeIndicatorEventsGeneratedEventType = {
  eventType: SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
  schema: knowledgeIndicatorQueriesGeneratedSchema,
};

const knowledgeIndicatorFeaturesIdentifiedEventType = {
  eventType: SIGNIFICANT_EVENTS_FEATURES_IDENTIFIED_EVENT_TYPE,
  schema: knowledgeIndicatorFeaturesIdentifiedSchema,
};

const agentBuilderKnowledgeIndicatorCreatedEventType = {
  eventType: SIGNIFICANT_EVENTS_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
  schema: agentBuilderKnowledgeIndicatorCreatedSchema,
};

const agentToolKiIdentificationStartedEventType = {
  eventType: SIGNIFICANT_EVENTS_AGENT_TOOL_KI_IDENTIFICATION_STARTED_EVENT_TYPE,
  schema: agentToolKnowledgeIndicatorIdentificationStartedSchema,
};

const agentToolEventCreateEventType = {
  eventType: SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE,
  schema: agentToolEventCreateSchema,
};

const agentToolEventStatusUpdateEventType = {
  eventType: SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_STATUS_UPDATE_EVENT_TYPE,
  schema: agentToolEventStatusUpdateSchema,
};

const agentToolEventInvestigationAttachEventType = {
  eventType: SIGNIFICANT_EVENTS_AGENT_TOOL_EVENT_INVESTIGATION_ATTACH_EVENT_TYPE,
  schema: agentToolEventInvestigationAttachSchema,
};

const codeAnalysisGroundingEventType = {
  eventType: SIGNIFICANT_EVENTS_CODE_ANALYSIS_GROUNDING_EVENT_TYPE,
  schema: codeAnalysisGroundingSchema,
};

const discoveryTriggeredEventType = {
  eventType: SIGNIFICANT_EVENTS_DISCOVERY_TRIGGERED_EVENT_TYPE,
  schema: discoveryTriggeredSchema,
};

const detectionScanEventType = {
  eventType: SIGNIFICANT_EVENTS_DETECTION_SCAN_EVENT_TYPE,
  schema: detectionScanSchema,
};

const onboardingScheduledEventType = {
  eventType: SIGNIFICANT_EVENTS_ONBOARDING_SCHEDULED_EVENT_TYPE,
  schema: onboardingScheduledSchema,
};

export {
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
};
