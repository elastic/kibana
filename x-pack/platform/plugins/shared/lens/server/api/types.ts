/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceSetup, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';

export type * from './routes/types';

export interface RegisterAPIRoutesArgs {
  http: HttpServiceSetup;
  contentManagement: ContentManagementServerSetup;
  builder: LensConfigBuilder;
  logger: Logger;
}

export type RegisterAPIRouteFn = (
  router: VersionedRouter<RequestHandlerContext>,
  args: Omit<RegisterAPIRoutesArgs, 'http'>
) => void;
