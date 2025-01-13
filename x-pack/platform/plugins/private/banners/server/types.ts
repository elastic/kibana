/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';

export type BannersRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
}>;

export type BannersRouter = IRouter<BannersRequestHandlerContext>;
