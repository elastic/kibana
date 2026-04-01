/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { DashboardSavedObjectAttributes, DashboardState } from '@kbn/dashboard-plugin/server';
// TODO: remove the deep import once we have a proper way to transform saved objects to dashboard states
import { transformDashboardOut } from '@kbn/dashboard-plugin/server/api/transforms';

export const toDashboardState = (
  savedObject: SavedObject<DashboardSavedObjectAttributes>
): DashboardState => {
  return transformDashboardOut(savedObject.attributes, savedObject.references)
    .dashboardState as DashboardState;
};
