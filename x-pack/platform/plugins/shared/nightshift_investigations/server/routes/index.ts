/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startInvestigationRoute } from './start_investigation';
import { getInvestigationRoute } from './get_investigation';
import { emitLifecycleEventRoute } from './emit_lifecycle_event';
import { ensureInvestigationRoute } from './ensure_investigation';
import { listInvestigationsRoute } from './list_investigations';
import { updateInvestigationRoute } from './update_investigation';
import { followInvestigationRoute } from './follow_investigation';
import { getInvestigationAvailabilityRoute } from './get_investigation_availability';

export const nightshiftInvestigationsRouteRepository = {
  ...startInvestigationRoute,
  ...getInvestigationRoute,
  ...emitLifecycleEventRoute,
  ...ensureInvestigationRoute,
  ...listInvestigationsRoute,
  ...updateInvestigationRoute,
  ...followInvestigationRoute,
  ...getInvestigationAvailabilityRoute,
};

export type NightshiftInvestigationsRouteRepository =
  typeof nightshiftInvestigationsRouteRepository;
