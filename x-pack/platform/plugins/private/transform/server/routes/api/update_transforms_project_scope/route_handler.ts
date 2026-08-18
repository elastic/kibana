/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import type { UpdateTransformsProjectScopeRequestSchema } from '../../api_schemas/update_transforms_project_scope';
import type { TransformRequestHandlerContext } from '../../../services/license';

import { wrapError, wrapEsError } from '../../utils/error_utils';
import { updateTransformsProjectScope } from './update_transforms_project_scope';

export const routeHandler: RequestHandler<
  undefined,
  undefined,
  UpdateTransformsProjectScopeRequestSchema,
  TransformRequestHandlerContext
> = async (ctx, req, res) => {
  try {
    const esClient = (await ctx.core).elasticsearch.client;
    const body = await updateTransformsProjectScope(req.body, esClient.asCurrentUser);
    return res.ok({
      body,
    });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
