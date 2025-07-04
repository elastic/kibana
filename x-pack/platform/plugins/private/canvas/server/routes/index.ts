/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter, Logger } from '@kbn/core/server';
import { ExpressionsServerSetup } from '@kbn/expressions-plugin/server';
import { initCustomElementsRoutes } from './custom_elements';
import { initShareablesRoutes } from './shareables';
import { initWorkpadRoutes } from './workpad';
import { initTemplateRoutes } from './templates';
import { initFunctionsRoutes } from './functions';
import { CanvasRouteHandlerContext } from '../workpad_route_context';

export interface RouteInitializerDeps {
  router: IRouter<CanvasRouteHandlerContext>;
  logger: Logger;
  expressions: ExpressionsServerSetup;
}

export function initRoutes(deps: RouteInitializerDeps) {
  initCustomElementsRoutes(deps);
  initShareablesRoutes(deps);
  initWorkpadRoutes(deps);
  initTemplateRoutes(deps);
  initFunctionsRoutes(deps);
}
