/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreSetup } from '@kbn/core/server';
import type {
  OnechatPluginStart,
  OnechatStartDependencies,
  OnechatSetupDependencies,
} from '../types';
import type { InternalStartServices } from '../services';
import type { OnechatRouter } from '../request_handler_context';
import type { TrackingService } from '../telemetry/tracking_service';

export interface RouteDependencies {
  router: OnechatRouter;
  logger: Logger;
  coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>;
  getInternalServices: () => InternalStartServices;
  pluginsSetup: OnechatSetupDependencies;
  trackingService?: TrackingService;
}
