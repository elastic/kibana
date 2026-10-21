/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationRouteDependencies } from '../types';
import { registerAssignInvestigationRoute } from './assign_investigation';
import { registerSetInvestigationStatusRoute } from './set_investigation_status';
import { registerGetInvestigationClosePreviewRoute } from './get_investigation_close_preview';
import { registerGetSeverityCountsRoute } from './get_severity_counts';
import { registerGetInvestigationRoute } from './get_investigation';
import { registerListInvestigationsRoute } from './list_investigations';
import { registerGetInvestigationsPrivilegesRoute } from './get_investigations_privileges';

export const registerInvestigationRoutes = (deps: InvestigationRouteDependencies) => {
  registerAssignInvestigationRoute(deps);
  registerSetInvestigationStatusRoute(deps);
  registerGetInvestigationClosePreviewRoute(deps);
  // Before `{id}`, so `_severity_counts` is never read as an investigation id.
  registerGetSeverityCountsRoute(deps);
  registerListInvestigationsRoute(deps);
  registerGetInvestigationRoute(deps);
  registerGetInvestigationsPrivilegesRoute(deps);
};
