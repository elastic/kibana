/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import { type DeleteTransformsRequestSchema } from '../../api_schemas/delete_transforms';

import type { TransformRequestHandlerContext } from '../../../services/license';
import type { RouteDependencies } from '../../../types';

import { wrapError, wrapEsError } from '../../utils/error_utils';

import { deleteTransforms } from './delete_transforms';

export const routeHandlerFactory: (
  routeDependencies: RouteDependencies
) => RequestHandler<
  undefined,
  undefined,
  DeleteTransformsRequestSchema,
  TransformRequestHandlerContext
> =
  ({ getCoreStart, getDataViewsStart }) =>
  async (ctx, req, res) => {
    try {
      const { savedObjects, elasticsearch } = await getCoreStart();
      const savedObjectsClient = savedObjects.getScopedClient(req);
      // TODO [CPS routing]: this client currently preserves the existing "origin-only" behavior.
      //   Review and choose one of the following options:
      //   A) Still unsure? Leave this comment as-is.
      //   B) Confirmed origin-only is correct? Replace this TODO with a concise explanation of why.
      //   C) Want to use current space’s NPRE (Named Project Routing Expression)? Change 'origin-only' to 'space' and remove this comment.
      //      Note: 'space' requires the request passed to asScoped() to carry a `url: URL` property.
      const esClient = elasticsearch.client.asScoped(req, { projectRouting: 'origin-only' }).asCurrentUser;

      const dataViews = await getDataViewsStart();
      const dataViewsService = await dataViews.dataViewsServiceFactory(
        savedObjectsClient,
        esClient,
        req
      );
      const body = await deleteTransforms(req.body, ctx, res, dataViewsService);

      if (body && body.status) {
        if (body.status === 404) {
          return res.notFound();
        }
        if (body.status === 403) {
          return res.forbidden();
        }
      }

      return res.ok({
        body,
      });
    } catch (e) {
      return res.customError(wrapError(wrapEsError(e)));
    }
  };
