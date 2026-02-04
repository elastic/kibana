/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { Logger, CoreSetup } from '@kbn/core/server';
import { getAllConnectorsRoute } from './connector/get_all';
import { getAllConnectorsIncludingSystemRoute } from './connector/get_all_system';
import { listTypesRoute } from './connector/list_types';
import { listTypesWithSystemRoute } from './connector/list_types_system';
import type { ILicenseState } from '../lib';
import type { ActionsRequestHandlerContext } from '../types';
import { createConnectorRoute } from './connector/create';
import { deleteConnectorRoute } from './connector/delete';
import { executeConnectorRoute } from './connector/execute';
import { getConnectorRoute } from './connector/get';
import { updateConnectorRoute } from './connector/update';
import { getOAuthAccessToken } from './get_oauth_access_token';
import { oauthAuthorizeRoute } from './oauth_authorize';
import { oauthCallbackRoute } from './oauth_callback';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { getGlobalExecutionLogRoute } from './get_global_execution_logs';
import { getGlobalExecutionKPIRoute } from './get_global_execution_kpi';

import type { ActionsPluginsStart } from '../plugin';
import type { OAuthRateLimiter } from '../lib/oauth_rate_limiter';

export interface RouteOptions {
  router: IRouter<ActionsRequestHandlerContext>;
  licenseState: ILicenseState;
  actionsConfigUtils: ActionsConfigurationUtilities;
  usageCounter?: UsageCounter;
  logger: Logger;
  core: CoreSetup<ActionsPluginsStart>;
  oauthRateLimiter: OAuthRateLimiter;
}

export function defineRoutes(opts: RouteOptions) {
  const { router, licenseState, actionsConfigUtils, logger, core, oauthRateLimiter } = opts;

  createConnectorRoute(router, licenseState);
  deleteConnectorRoute(router, licenseState);
  getConnectorRoute(router, licenseState);
  getAllConnectorsRoute(router, licenseState);
  updateConnectorRoute(router, licenseState);
  listTypesRoute(router, licenseState);
  executeConnectorRoute(router, licenseState);
  getGlobalExecutionLogRoute(router, licenseState);
  getGlobalExecutionKPIRoute(router, licenseState);

  getOAuthAccessToken(router, licenseState, actionsConfigUtils);
  oauthAuthorizeRoute(router, licenseState, logger, core, oauthRateLimiter);
  oauthCallbackRoute(router, licenseState, actionsConfigUtils, logger, core, oauthRateLimiter);
  getAllConnectorsIncludingSystemRoute(router, licenseState);
  listTypesWithSystemRoute(router, licenseState);
}
