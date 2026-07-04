/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalMemoryRoutes } from './internal/memory/route';
import { significantEventsRoutes } from './significant_events/route';
import { keepAliveRoutes } from './internal/knowledge_indicators/keep_alive/route';
import { queryRoutes } from './queries/route';
import { internalAvailabilityRoutes } from './internal/availability/route';
import { internalDetectionsRoutes } from './internal/detections/route';
import { internalDetectionsWorkflowRoutes } from './internal/detections/workflow_route';
import { internalDiscoveriesRoutes } from './internal/discoveries/route';
import { internalDiscoveryRoutes } from './internal/discovery/route';
import { internalEligibleStreamsRoutes } from './internal/extraction/eligible_streams_route';
import { internalKIContinuousKIExtractionRoutes } from './internal/knowledge_indicators/continuous_ki_extraction/route';
import { internalKIFeatureRoutes } from './internal/knowledge_indicators/features/route';
import { identifyKIFeaturesRoutes } from './internal/knowledge_indicators/features/identify_route';
import { internalEventsRoutes } from './internal/events/route';
import { internalKIOnboardingRoutes } from './internal/knowledge_indicators/onboarding/route';
import { internalPromptsRoutes } from './internal/prompts/route';
import { internalKIQueriesRoutes } from './internal/knowledge_indicators/queries/route';
import { internalKIQueryOccurrencesRoutes } from './internal/knowledge_indicators/query_occurrences/route';

export const streamsRouteRepository = {
  // internal APIs
  ...internalAvailabilityRoutes,
  ...internalDetectionsRoutes,
  ...internalDetectionsWorkflowRoutes,
  ...internalDiscoveryRoutes,
  ...internalDiscoveriesRoutes,
  ...internalEligibleStreamsRoutes,
  ...internalEventsRoutes,
  ...internalKIContinuousKIExtractionRoutes,
  ...identifyKIFeaturesRoutes,
  ...internalKIFeatureRoutes,
  ...internalKIOnboardingRoutes,
  ...internalKIQueriesRoutes,
  ...internalKIQueryOccurrencesRoutes,
  ...internalMemoryRoutes,
  ...internalPromptsRoutes,
  // public APIs
  ...keepAliveRoutes,
  ...queryRoutes,
  ...significantEventsRoutes,
};

export type StreamsRouteRepository = typeof streamsRouteRepository;
