/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { hasDataRoute } from './has_data';

export const historicalDataRouteDefinitions = {
  hasData: hasDataRoute,
};

export type { HasDataResponse } from './has_data';
