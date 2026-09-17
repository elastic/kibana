/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IncidentRouteDependencies } from '../types';
import { registerCreateIncidentRoute } from './create_incident';
import { registerListIncidentsRoute } from './list_incidents';
import { registerUpdateIncidentRoute } from './update_incident';

export const registerIncidentRoutes = (deps: IncidentRouteDependencies) => {
  registerCreateIncidentRoute(deps);
  registerListIncidentsRoute(deps);
  registerUpdateIncidentRoute(deps);
};
