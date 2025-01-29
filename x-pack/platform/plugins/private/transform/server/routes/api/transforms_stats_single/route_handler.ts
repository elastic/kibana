/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import type { TransformIdParamSchema } from '../../api_schemas/common';
import type { GetTransformStatsQuerySchema } from '../../api_schemas/transforms_stats';

import type { TransformRequestHandlerContext } from '../../../services/license';

import { wrapError, wrapEsError } from '../../utils/error_utils';

export const routeHandler: RequestHandler<
  TransformIdParamSchema,
  GetTransformStatsQuerySchema,
  undefined,
  TransformRequestHandlerContext
> = async (ctx, req, res) => {
  const { transformId } = req.params;
  try {
    const basic = req.query.basic ?? false;

    const esClient = (await ctx.core).elasticsearch.client;
    const body = await esClient.asCurrentUser.transform.getTransformStats(
      {
        transform_id: transformId,
        // @ts-expect-error `basic` query option not yet in @elastic/elasticsearch
        basic,
      },
      { maxRetries: 0 }
    );
    return res.ok({ body });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
