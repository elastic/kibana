/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImpactRouteDependencies } from '../types';
import { registerAttachImpactRoute } from './attach_impact';
import { registerGetImpactRoute } from './get_impact';

export const registerImpactRoutes = (deps: ImpactRouteDependencies) => {
  registerAttachImpactRoute(deps);
  registerGetImpactRoute(deps);
};
