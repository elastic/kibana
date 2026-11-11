/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { NotificationCenterPluginStart, NotificationCenterStartDependencies } from '../types';

export type NotificationCenterCoreSetup = CoreSetup<
  NotificationCenterStartDependencies,
  NotificationCenterPluginStart
>;

export interface NotificationRouteDeps {
  router: IRouter;
  core: NotificationCenterCoreSetup;
  logger: Logger;
}

/**
 * v1 has no per-notification authorization, notifications are broadcast to every
 * authenticated user, and read-state reads/writes are scoped to the user's own
 * profile via `core.userStorage.asScoped`. There is no Kibana feature privilege to gate on yet.
 */
export const NC_AUTHZ_OPT_OUT_REASON =
  'Notification Center v1 broadcasts to every authenticated user with no per-notification ' +
  'authorization; read-state is scoped to the caller’s own profile via core.userStorage.asScoped.';
