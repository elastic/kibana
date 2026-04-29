/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import type { StartTransformsRequestSchema } from '../../api_schemas/start_transforms';

import type { TransformRequestHandlerContext } from '../../../services/license';

import { wrapError, wrapEsError } from '../../utils/error_utils';

import { startTransforms } from './start_transforms';

export const routeHandler: RequestHandler<
  undefined,
  undefined,
  StartTransformsRequestSchema,
  TransformRequestHandlerContext
> = async (ctx, req, res) => {
  const transformsInfo = req.body;

  try {
    const esClient = (await ctx.core).elasticsearch.client;
    const body = await startTransforms(transformsInfo, esClient.asCurrentUser);
    return res.ok({
      body,
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
