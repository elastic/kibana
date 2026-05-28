/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { observabilityOverviewHasDataRoute } from './observability_overview_has_data';
import { observabilityOverviewRoute } from './observability_overview';

export const observabilityOverviewRouteDefinitions = {
  observabilityOverviewHasData: observabilityOverviewHasDataRoute,
  observabilityOverview: observabilityOverviewRoute,
};

export type { ObservabilityOverviewHasDataResponse } from './observability_overview_has_data';
export type { ObservabilityOverviewResponse } from './observability_overview';
