/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EscalationRouteDependencies } from '../types';
import { registerAssignEscalationRoute } from './assign_escalation';
import { registerCreateEscalationRoute } from './create_escalation';
import { registerListEscalationsRoute } from './list_escalations';
import { registerSuggestUsersRoute } from './suggest_users';
import { registerUpdateEscalationRoute } from './update_escalation';

export const registerEscalationRoutes = (deps: EscalationRouteDependencies) => {
  registerCreateEscalationRoute(deps);
  registerListEscalationsRoute(deps);
  registerUpdateEscalationRoute(deps);
  registerSuggestUsersRoute(deps);
  registerAssignEscalationRoute(deps);
};
