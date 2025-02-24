/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { RequestHandler } from '@kbn/core/server';

import type { TransformRequestHandlerContext } from '../../../services/license';
import { transformHealthServiceProvider } from '../../../lib/alerting/transform_health_rule_type/transform_health_service';

import { wrapError, wrapEsError } from '../../utils/error_utils';

export const routeHandler: RequestHandler<
  estypes.TransformGetTransformRequest,
  undefined,
  undefined,
  TransformRequestHandlerContext
> = async (ctx, req, res) => {
  try {
    const esClient = (await ctx.core).elasticsearch.client;
    const body = await esClient.asCurrentUser.transform.getTransform({
      size: 1000,
      ...req.params,
    });

    const alerting = await ctx.alerting;

    if (alerting) {
      const rulesClient = await alerting.getRulesClient();

      const transformHealthService = transformHealthServiceProvider({
        esClient: esClient.asCurrentUser,
        rulesClient,
      });

      // @ts-ignore
      await transformHealthService.populateTransformsWithAssignedRules(body.transforms);
    }

    return res.ok({ body });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
