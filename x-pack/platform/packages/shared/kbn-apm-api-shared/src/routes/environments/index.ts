/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { environmentsRoute } from './environments';
import { unifiedEnvironmentsRoute } from './unified_environments';

export const environmentsRouteDefinitions = {
  environments: environmentsRoute,
  unifiedEnvironments: unifiedEnvironmentsRoute,
};

export type { EnvironmentsResponse } from './environments';
