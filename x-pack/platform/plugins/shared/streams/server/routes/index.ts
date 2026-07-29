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
import { graphRoutes } from './streams/graph/route';
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
import { timeSeriesRoutes } from './internal/streams/time_series/route';

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
  ...storageStatsRoutes,
  // public APIs
  ...docCountsRoutes,
  ...crudRoutes,
  ...enablementRoutes,
  ...managementRoutes,
  ...ingestRoutes,
  ...graphRoutes,
  ...queryStreamRoutes,
  ...contentRoutes,
  ...attachmentRoutes,
};

export type StreamsRouteRepository = typeof streamsRouteRepository;
