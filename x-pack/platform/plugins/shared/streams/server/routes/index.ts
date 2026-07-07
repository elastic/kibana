/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { crudRoutes } from './streams/crud/route';
import { enablementRoutes } from './streams/enablement/route';
import { managementRoutes } from './streams/management/route';
import { internalSchemaRoutes } from './internal/streams/schema/route';
import { internalProcessingRoutes } from './internal/streams/processing/route';
import { ingestRoutes } from './streams/ingest/route';
import { internalLifecycleRoutes } from './internal/streams/lifecycle/route';
import { queryStreamRoutes } from './streams/query/route';
import { contentRoutes } from './content/route';
import { internalCrudRoutes } from './internal/streams/crud/route';
import { internalManagementRoutes } from './internal/streams/management/route';
import { failureStoreRoutes } from './internal/streams/failure_store/route';
import { internalIngestRoutes } from './internal/streams/ingest/route';
import { connectorRoutes } from './internal/connectors/route';
import { docCountsRoutes } from './streams/doc_counts/route';
import { storageStatsRoutes } from './streams/storage_stats/route';
import { attachmentRoutes } from './attachments/route';
import { internalAttachmentRoutes } from './internal/attachments/route';
import { internalDescriptionGenerationRoutes } from './internal/description_generation/route';
import { internalTasksRoutes } from './internal/streams/tasks/route';
import { timeSeriesRoutes } from './internal/streams/time_series/route';
import { internalMemoryRoutes } from './internal/significant_events/memory/route';
import { significantEventsRoutes } from './significant_events/significant_events/route';
import { keepAliveRoutes } from './internal/significant_events/knowledge_indicators/keep_alive/route';
import { queryRoutes } from './significant_events/queries/route';
import { internalSignificantEventsAvailabilityRoutes } from './internal/significant_events/availability/route';
import { internalSignificantEventsDetectionsRoutes } from './internal/significant_events/detections/route';
import { internalSignificantEventsDetectionsWorkflowRoutes } from './internal/significant_events/detections/workflow_route';
import { internalSignificantEventsResetKisRoutes } from './internal/significant_events/knowledge_indicators/reset_kis/route';
import { internalSignificantEventsDiscoveriesRoutes } from './internal/significant_events/discoveries/route';
import { internalSignificantEventsDiscoveryRoutes } from './internal/significant_events/discovery/route';
import { internalSignificantEventsEligibleStreamsRoutes } from './internal/significant_events/extraction/eligible_streams_route';
import { internalSignificantEventsKIContinuousKIExtractionRoutes } from './internal/significant_events/knowledge_indicators/continuous_ki_extraction/route';
import { internalSignificantEventsKIFeatureRoutes } from './internal/significant_events/knowledge_indicators/features/route';
import { identifySignificantEventsKIFeaturesRoutes } from './internal/significant_events/knowledge_indicators/features/identify_route';
import { internalSignificantEventsEventsRoutes } from './internal/significant_events/events/route';
import { internalSignificantEventsKIOnboardingRoutes } from './internal/significant_events/knowledge_indicators/onboarding/route';
import { internalSignificantEventsPromptsRoutes } from './internal/significant_events/prompts/route';
import { internalSignificantEventsKIQueriesRoutes } from './internal/significant_events/knowledge_indicators/queries/route';
import { internalSignificantEventsKIQueryOccurrencesRoutes } from './internal/significant_events/knowledge_indicators/query_occurrences/route';

export const streamsRouteRepository = {
  // internal APIs
  ...internalCrudRoutes,
  ...internalManagementRoutes,
  ...internalSchemaRoutes,
  ...internalLifecycleRoutes,
  ...internalProcessingRoutes,
  ...failureStoreRoutes,
  ...timeSeriesRoutes,
  ...internalIngestRoutes,
  ...connectorRoutes,
  ...internalAttachmentRoutes,
  ...internalDescriptionGenerationRoutes,
  ...internalTasksRoutes,
  ...internalMemoryRoutes,
  ...internalSignificantEventsAvailabilityRoutes,
  ...internalSignificantEventsDetectionsRoutes,
  ...internalSignificantEventsDetectionsWorkflowRoutes,
  ...internalSignificantEventsResetKisRoutes,
  ...internalSignificantEventsDiscoveryRoutes,
  ...internalSignificantEventsDiscoveriesRoutes,
  ...internalSignificantEventsEligibleStreamsRoutes,
  ...internalSignificantEventsEventsRoutes,
  ...internalSignificantEventsKIContinuousKIExtractionRoutes,
  ...identifySignificantEventsKIFeaturesRoutes,
  ...internalSignificantEventsKIFeatureRoutes,
  ...internalSignificantEventsKIOnboardingRoutes,
  ...internalSignificantEventsKIQueriesRoutes,
  ...internalSignificantEventsKIQueryOccurrencesRoutes,
  ...internalSignificantEventsPromptsRoutes,
  ...storageStatsRoutes,
  // public APIs
  ...docCountsRoutes,
  ...crudRoutes,
  ...enablementRoutes,
  ...managementRoutes,
  ...ingestRoutes,
  ...queryStreamRoutes,
  ...contentRoutes,
  ...queryRoutes,
  ...attachmentRoutes,
  ...significantEventsRoutes,
  ...keepAliveRoutes,
};

export type StreamsRouteRepository = typeof streamsRouteRepository;
