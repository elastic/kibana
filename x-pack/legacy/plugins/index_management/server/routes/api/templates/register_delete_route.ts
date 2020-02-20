/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { wrapEsError } from '../../helpers';

import { Template } from '../../../../common/types';

const paramsSchema = schema.object({
  names: schema.string(),
});

export function registerDeleteRoute({ router, license }: RouteDependencies) {
  router.delete(
    { path: addBasePath('/templates/{names}'), validate: { params: paramsSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { names } = req.params as typeof paramsSchema.type;
      const templateNames = names.split(',');
      const response: { templatesDeleted: Array<Template['name']>; errors: any[] } = {
        templatesDeleted: [],
        errors: [],
      };

      await Promise.all(
        templateNames.map(async name => {
          try {
            await ctx.core.elasticsearch.dataClient.callAsCurrentUser('indices.deleteTemplate', {
              name,
            });
            return response.templatesDeleted.push(name);
          } catch (e) {
            return response.errors.push({
              name,
              error: wrapEsError(e),
            });
          }
        })
      );

      return res.ok({ body: response });
    })
  );
}
