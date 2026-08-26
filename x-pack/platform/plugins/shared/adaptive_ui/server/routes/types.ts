/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaPublicUrlHttp } from '../kibana_public_url';

export interface AdaptiveUiRouteDependencies {
  router: IRouter;
  logger: Logger;
  /** Actions start isn't available at setup; resolved at request time. */
  getActions: () => Promise<ActionsPluginStart>;
  http: KibanaPublicUrlHttp;
}
