/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpServiceSetup, Logger, RequestHandlerContext } from '@kbn/core/server';
import { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { VersionedRouter } from '@kbn/core-http-server';

export interface RegisterAPIRoutesArgs {
  http: HttpServiceSetup;
  contentManagement: ContentManagementServerSetup;
  logger: Logger;
}

export type RegisterAPIRouteFn = (
  router: VersionedRouter<RequestHandlerContext>,
  args: Omit<RegisterAPIRoutesArgs, 'http'>
) => void;
