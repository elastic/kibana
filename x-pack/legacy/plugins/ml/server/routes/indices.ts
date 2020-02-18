/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapError } from '../client/error_wrapper';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { RouteInitialization } from '../new_platform/plugin';

/**
 * Indices routes.
 */
export function indicesRoutes({ xpackMainPlugin, router }: RouteInitialization) {
  /**
   * @apiGroup Indices
   *
   * @api {post} /api/ml/indices/field_caps
   * @apiName FieldCaps
   * @apiDescription Retrieves the capabilities of fields among multiple indices.
   */
  router.post(
    {
      path: '/api/ml/indices/field_caps',
      validate: {
        body: schema.object({
          index: schema.maybe(schema.string()),
          fields: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const {
          body: { index, fields: requestFields },
        } = request;
        const fields =
          requestFields !== undefined && Array.isArray(requestFields)
            ? requestFields.join(',')
            : '*';
        const result = await context.ml!.mlClient.callAsCurrentUser('fieldCaps', { index, fields });
        return response.ok({ body: result });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
