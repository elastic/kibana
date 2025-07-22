/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreSetup, IRouter } from '@kbn/core/server';
import type { OnechatPluginStart, OnechatStartDependencies } from '../types';
import type { InternalStartServices } from '../services';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  coreSetup: CoreSetup<OnechatStartDependencies, OnechatPluginStart>;
  getInternalServices: () => InternalStartServices;
}
