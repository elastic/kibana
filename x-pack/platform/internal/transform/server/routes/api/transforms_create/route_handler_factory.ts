/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { RuntimeField } from '@kbn/data-views-plugin/common';
import type { DataViewCreateQuerySchema } from '@kbn/ml-data-view-utils/schemas/api_create_query_schema';
import { createDataViewFn } from '@kbn/ml-data-view-utils/actions/create';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { TransformIdParamSchema } from '../../../../common/api_schemas/common';
import type {
  PutTransformsRequestSchema,
  PutTransformsResponseSchema,
} from '../../../../common/api_schemas/transforms';
import { isLatestTransform } from '../../../../common/types/transform';

import type { RouteDependencies } from '../../../types';
import type { TransformRequestHandlerContext } from '../../../services/license';

import { wrapEsError } from '../../utils/error_utils';

export const routeHandlerFactory: (
  routeDependencies: RouteDependencies
) => RequestHandler<
  TransformIdParamSchema,
  DataViewCreateQuerySchema,
  PutTransformsRequestSchema,
  TransformRequestHandlerContext
> = (routeDependencies) => async (ctx, req, res) => {
  const { coreStart, dataViews } = routeDependencies;
  const { transformId } = req.params;
  const { createDataView, timeFieldName } = req.query;

  const response: PutTransformsResponseSchema = {
    dataViewsCreated: [],
    dataViewsErrors: [],
    transformsCreated: [],
    errors: [],
  };

  const esClient = (await ctx.core).elasticsearch.client;

  try {
    const resp = await esClient.asCurrentUser.transform.putTransform({
      // @ts-expect-error @elastic/elasticsearch group_by is expected to be optional in TransformPivot
      body: req.body,
      transform_id: transformId,
    });

    if (resp.acknowledged) {
      response.transformsCreated.push({ transform: transformId });
    } else {
      response.errors.push({
        id: transformId,
        error: wrapEsError(resp),
      });
    }
  } catch (e) {
    response.errors.push({
      id: transformId,
      error: wrapEsError(e),
    });
  }

  if (createDataView) {
    const { savedObjects, elasticsearch } = coreStart;
    const dataViewsService = await dataViews.dataViewsServiceFactory(
      savedObjects.getScopedClient(req),
      elasticsearch.client.asScoped(req).asCurrentUser,
      req
    );

    const runtimeMappings = req.body.source.runtime_mappings as Record<string, RuntimeField>;

    const { dataViewsCreated, dataViewsErrors } = await createDataViewFn({
      dataViewsService,
      dataViewName: req.body.dest.index,
      // Adding runtime mappings for transforms of type latest only here
      // since only they will want to replicate the source index mapping.
      // Pivot type transforms have index mappings that cannot be
      // inferred from the source index.
      runtimeMappings:
        isPopulatedObject(runtimeMappings) && isLatestTransform(req.body) ? runtimeMappings : {},
      timeFieldName,
      errorFallbackId: transformId,
    });

    response.dataViewsCreated = dataViewsCreated;
    response.dataViewsErrors = dataViewsErrors;
  }

  return res.ok({ body: response });
};
