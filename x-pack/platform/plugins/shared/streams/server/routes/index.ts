/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { crudRoutes } from './public/stream_management/crud/route';
import { enablementRoutes } from './public/stream_management/enablement/route';
import { managementRoutes } from './public/stream_management/management/route';
import { internalSchemaRoutes } from './internal/stream_management/schema/route';
import { internalProcessingRoutes } from './internal/stream_management/processing/route';
import { ingestRoutes } from './public/stream_management/ingest/route';
import { internalLifecycleRoutes } from './internal/stream_management/lifecycle/route';
import { queryStreamRoutes } from './public/sig_events/query/route';
import { contentRoutes } from './public/stream_management/content/route';
import { internalCrudRoutes } from './internal/stream_management/crud/route';
import { internalManagementRoutes } from './internal/stream_management/management/route';
import { systemRoutes as internalSystemsRoutes } from './internal/sig_events/systems/route';
import { internalPromptsRoutes } from './internal/sig_events/prompts/route';
import { internalSignificantEventsRoutes } from './internal/sig_events/significant_events/route';
import { significantEventsRoutes } from './public/sig_events/significant_events/route';
import { queryRoutes } from './public/sig_events/queries/route';
import { failureStoreRoutes } from './internal/stream_management/failure_store/route';
import { internalIngestRoutes } from './internal/stream_management/ingest/route';
import { connectorRoutes } from './internal/stream_management/connectors/route';
import { docCountsRoutes } from './public/stream_management/doc_counts/route';
import { attachmentRoutes } from './public/stream_management/attachments/route';
import { internalAttachmentRoutes } from './internal/stream_management/attachments/route';
import { internalDescriptionGenerationRoutes } from './internal/sig_events/description_generation/route';
import { featureRoutes as internalFeatureRoutes } from './internal/sig_events/features/route';
import { internalInsightsRoutes } from './internal/sig_events/insights/route';
import { internalTasksRoutes } from './internal/sig_events/tasks/route';
import { internalOnboardingRoutes } from './internal/sig_events/onboarding/route';
import { internalQueriesRoutes } from './internal/sig_events/queries/route';

export const streamsRouteRepository = {
  // internal APIs
  ...internalCrudRoutes,
  ...internalManagementRoutes,
  ...internalSchemaRoutes,
  ...internalLifecycleRoutes,
  ...internalProcessingRoutes,
  ...failureStoreRoutes,
  ...internalSystemsRoutes,
  ...internalPromptsRoutes,
  ...internalSignificantEventsRoutes,
  ...internalIngestRoutes,
  ...connectorRoutes,
  ...internalAttachmentRoutes,
  ...internalDescriptionGenerationRoutes,
  ...internalFeatureRoutes,
  ...internalInsightsRoutes,
  ...internalTasksRoutes,
  ...internalOnboardingRoutes,
  ...internalQueriesRoutes,
  // public APIs
  ...docCountsRoutes,
  ...crudRoutes,
  ...enablementRoutes,
  ...managementRoutes,
  ...ingestRoutes,
  ...queryStreamRoutes,
  ...contentRoutes,
  ...significantEventsRoutes,
  ...queryRoutes,
  ...attachmentRoutes,
};

export type StreamsRouteRepository = typeof streamsRouteRepository;
