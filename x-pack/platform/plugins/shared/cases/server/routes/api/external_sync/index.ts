/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseRoute } from '../types';
import { notifyExternalSyncRoute } from './notify_external_sync';
import { getExternalSyncServiceAccountRoutes } from './service_account_routes';
import type { ExternalSyncRouteDeps } from './types';

export type { ExternalSyncRouteDeps } from './types';

export const getExternalSyncRoutes = (deps: ExternalSyncRouteDeps): CaseRoute[] => [
  notifyExternalSyncRoute(deps),
  ...getExternalSyncServiceAccountRoutes(deps),
];
