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
import { groupRoutes } from './streams/group/route';
import { contentRoutes } from './content/route';
import { internalCrudRoutes } from './internal/streams/crud/route';
import { internalManagementRoutes } from './internal/streams/management/route';
import { featureRoutes as internalFeaturesRoutes } from './internal/streams/features/route';
import { significantEventsRoutes } from './streams/significant_events/route';
import { queryRoutes } from './queries/route';
import { failureStoreRoutes } from './internal/streams/failure_store/route';
import { internalIngestRoutes } from './internal/streams/ingest/route';
import { connectorRoutes } from './internal/connectors/route';
import { attachmentRoutes } from './attachments/route';
import { internalAttachmentRoutes } from './internal/attachments/route';

export const streamsRouteRepository = {
  // internal APIs
  ...internalCrudRoutes,
  ...internalManagementRoutes,
  ...internalSchemaRoutes,
  ...internalLifecycleRoutes,
  ...internalProcessingRoutes,
  ...failureStoreRoutes,
  ...internalFeaturesRoutes,
  ...internalIngestRoutes,
  ...connectorRoutes,
  ...internalAttachmentRoutes,
  // public APIs
  ...crudRoutes,
  ...enablementRoutes,
  ...managementRoutes,
  ...ingestRoutes,
  ...groupRoutes,
  ...contentRoutes,
  ...significantEventsRoutes,
  ...queryRoutes,
  ...attachmentRoutes,
};

export type StreamsRouteRepository = typeof streamsRouteRepository;
