/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { EscalationsService } from './services/escalations_service';

export interface EscalationRouteDependencies {
  router: IRouter;
  logger: Logger;
  getEscalationsService: () => EscalationsService;
  /** Returns the current space id; falls back to `'default'` when the spaces plugin is absent. */
  getSpaceId: (request: KibanaRequest) => string;
  /** Resolves the security plugin start contract; undefined when security is absent. */
  getSecurity: () => Promise<SecurityPluginStart | undefined>;
}
