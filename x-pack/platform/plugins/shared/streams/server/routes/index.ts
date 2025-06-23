/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalEsqlRoutes } from './internal/esql/route';
import { dashboardRoutes } from './dashboards/route';
import { crudRoutes } from './streams/crud/route';
import { enablementRoutes } from './streams/enablement/route';
import { managementRoutes } from './streams/management/route';
import { internalSchemaRoutes } from './internal/streams/schema/route';
import { internalProcessingRoutes } from './internal/streams/processing/route';
import { ingestRoutes } from './streams/ingest/route';
import { internalLifecycleRoutes } from './internal/streams/lifecycle/route';
import { groupRoutes } from './streams/group/route';
import { contentRoutes } from './content/route';
import { internalDashboardRoutes } from './internal/dashboards/route';
import { internalCrudRoutes } from './internal/streams/crud/route';
import { internalManagementRoutes } from './internal/streams/management/route';
import { significantEventsRoutes } from './streams/significant_events/route';
import { queryRoutes } from './queries/route';

export const streamsRouteRepository = {
  // internal APIs
  ...internalEsqlRoutes,
  ...internalDashboardRoutes,
  ...internalCrudRoutes,
  ...internalManagementRoutes,
  ...internalSchemaRoutes,
  ...internalLifecycleRoutes,
  ...internalProcessingRoutes,
  // public APIs
  ...dashboardRoutes,
  ...crudRoutes,
  ...enablementRoutes,
  ...managementRoutes,
  ...ingestRoutes,
  ...groupRoutes,
  ...contentRoutes,
  ...significantEventsRoutes,
  ...queryRoutes,
};

export type StreamsRouteRepository = typeof streamsRouteRepository;
