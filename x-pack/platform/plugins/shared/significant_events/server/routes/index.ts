/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalAvailabilityRoutes } from './internal/availability/route';
import { internalSlackAppRoutes } from './internal/apps/slack/route';
import { internalDetectionsRoutes } from './internal/detections/route';
import { internalDetectionsWorkflowRoutes } from './internal/detections/workflow_route';
import { internalDiscoveriesRoutes } from './internal/discoveries/route';
import { internalDiscoveryRoutes } from './internal/discovery/route';
import { internalEventsRoutes } from './internal/events/route';
import { internalIdentifyKIFeaturesRoutes } from './internal/knowledge_indicators/features/identify_route';
import { internalKIContinuousKIExtractionRoutes } from './internal/knowledge_indicators/continuous_ki_extraction/route';
import { internalKIEligibleStreamsRoutes } from './internal/knowledge_indicators/extraction/eligible_streams_route';
import { internalKIFeatureRoutes } from './internal/knowledge_indicators/features/route';
import { internalKIKeepAliveRoutes } from './internal/knowledge_indicators/keep_alive/route';
import { internalKIOnboardingRoutes } from './internal/knowledge_indicators/onboarding/route';
import { internalKIQueriesRoutes } from './internal/knowledge_indicators/queries/route';
import { internalKIQueryOccurrencesRoutes } from './internal/knowledge_indicators/query_occurrences/route';
import { internalKIResetKisRoutes } from './internal/knowledge_indicators/reset_kis/route';
import { internalMemoryRoutes } from '../memory_and_investigation/routes/route';
import { internalPromptsRoutes } from './internal/prompts/route';
import { reconcileRoutes } from './internal/knowledge_indicators/reconcile_route';
import { internalScheduledDiscoveryRoutes } from './internal/scheduled_discovery/route';
import { queryRoutes } from './queries/route';
import { significantEventsRoutes } from './significant_events/route';

export const significantEventsRouteRepository = {
  // internal APIs
  ...internalAvailabilityRoutes,
  ...internalSlackAppRoutes,
  ...internalDetectionsRoutes,
  ...internalDetectionsWorkflowRoutes,
  ...internalDiscoveriesRoutes,
  ...internalDiscoveryRoutes,
  ...internalEventsRoutes,
  ...internalIdentifyKIFeaturesRoutes,
  ...internalKIContinuousKIExtractionRoutes,
  ...internalKIEligibleStreamsRoutes,
  ...internalKIFeatureRoutes,
  ...internalKIKeepAliveRoutes,
  ...internalKIOnboardingRoutes,
  ...internalKIQueriesRoutes,
  ...internalKIQueryOccurrencesRoutes,
  ...internalKIResetKisRoutes,
  ...internalMemoryRoutes,
  ...internalPromptsRoutes,
  ...reconcileRoutes,
  ...internalScheduledDiscoveryRoutes,
  // public APIs
  ...queryRoutes,
  ...significantEventsRoutes,
};

export type SignificantEventsRouteRepository = typeof significantEventsRouteRepository;
