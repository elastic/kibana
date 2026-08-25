/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startInvestigationRoute } from './start_investigation';
import { getInvestigationRoute } from './get_investigation';
import { emitLifecycleEventRoute } from './emit_lifecycle_event';
import { listInvestigationsRoute } from './list_investigations';

export const nightshiftInvestigationsRouteRepository = {
  ...startInvestigationRoute,
  ...getInvestigationRoute,
  ...emitLifecycleEventRoute,
  ...listInvestigationsRoute,
};

export type NightshiftInvestigationsRouteRepository =
  typeof nightshiftInvestigationsRouteRepository;
