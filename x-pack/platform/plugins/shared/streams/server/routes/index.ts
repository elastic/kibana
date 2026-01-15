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
import { contentRoutes } from './content/route';
import { internalCrudRoutes } from './internal/streams/crud/route';
import { internalManagementRoutes } from './internal/streams/management/route';
import { systemRoutes as internalSystemsRoutes } from './internal/streams/systems/route';
import { internalPromptsRoutes } from './internal/streams/prompts/route';
import { internalSignificantEventsRoutes } from './internal/streams/significant_events/route';
import { significantEventsRoutes } from './streams/significant_events/route';
import { queryRoutes } from './queries/route';
import { failureStoreRoutes } from './internal/streams/failure_store/route';
import { internalIngestRoutes } from './internal/streams/ingest/route';
import { connectorRoutes } from './internal/connectors/route';
import { docCountsRoutes } from './streams/doc_counts/route';
import { attachmentRoutes } from './attachments/route';
import { internalAttachmentRoutes } from './internal/attachments/route';
import { internalDescriptionGenerationRoutes } from './internal/streams/description_generation/route';
import { featureRoutes as internalFeatureRoutes } from './internal/streams/features/route';

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
  // public APIs
  ...docCountsRoutes,
  ...crudRoutes,
  ...enablementRoutes,
  ...managementRoutes,
  ...ingestRoutes,
  ...contentRoutes,
  ...significantEventsRoutes,
  ...queryRoutes,
  ...attachmentRoutes,
};

export type StreamsRouteRepository = typeof streamsRouteRepository;
