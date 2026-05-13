/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ServiceIdentifier } from 'inversify';
import type { MaintenanceWindowServiceContract } from './maintenance_window_service';

/**
 * Pre-configured SavedObjects client with hidden types for maintenance windows
 */
export const MaintenanceWindowSavedObjectsClientToken = Symbol.for(
  'alerting_v2.MaintenanceWindowSavedObjectsClient'
) as ServiceIdentifier<SavedObjectsClientContract>;

/**
 * MaintenanceWindowService singleton (internal user, no request scope)
 */
export const MaintenanceWindowServiceInternalToken = Symbol.for(
  'alerting_v2.MaintenanceWindowServiceInternal'
) as ServiceIdentifier<MaintenanceWindowServiceContract>;
