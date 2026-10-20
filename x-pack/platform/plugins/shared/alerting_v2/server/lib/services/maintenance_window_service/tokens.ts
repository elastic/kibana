/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { createToken } from '@kbn/core-di';
import type { MaintenanceWindowServiceContract } from './maintenance_window_service';

/**
 * Pre-configured SavedObjects client with hidden types for maintenance windows
 */
export const MaintenanceWindowSavedObjectsClientToken = createToken<SavedObjectsClientContract>(
  'alerting_v2.MaintenanceWindowSavedObjectsClient'
);

/**
 * MaintenanceWindowService singleton (internal user, no request scope)
 */
export const MaintenanceWindowServiceInternalToken = createToken<MaintenanceWindowServiceContract>(
  'alerting_v2.MaintenanceWindowServiceInternal'
);
