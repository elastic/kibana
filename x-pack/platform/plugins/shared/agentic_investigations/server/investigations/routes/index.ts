/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerGetInvestigationRoute } from './get_investigation_route';
import { registerListInvestigationsRoute } from './list_investigations_route';
import { registerPatchInvestigationRoute } from './patch_investigation_route';
import type { InvestigationsRouteDependencies } from './shared';
import { registerUpsertInvestigationRoute } from './upsert_investigation_route';

export { type InvestigationsRouteDependencies } from './shared';

export const registerInvestigationRoutes = (deps: InvestigationsRouteDependencies) => {
  registerUpsertInvestigationRoute(deps);
  registerPatchInvestigationRoute(deps);
  registerListInvestigationsRoute(deps);
  registerGetInvestigationRoute(deps);
};
