/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { API_BASE_PATH } from '../../../common/constants';
import { RouteDependencies } from '../../types';

const paramsSchema = schema.object({
  names: schema.string(),
});

export const registerDeleteRoute = ({ router }: RouteDependencies): void => {
  router.delete(
    {
      path: `${API_BASE_PATH}/{names}`,
      validate: {
        params: paramsSchema,
      },
    },
    async (ctx, req, res) => {
      const { client: clusterClient } = (await ctx.core).elasticsearch;
      const { names } = req.params;
      const pipelineNames = names.split(',');

      const response: { itemsDeleted: string[]; errors: any[] } = {
        itemsDeleted: [],
        errors: [],
      };

      await Promise.all(
        pipelineNames.map((pipelineName) => {
          return clusterClient.asCurrentUser.ingest
            .deletePipeline({ id: pipelineName })
            .then(() => response.itemsDeleted.push(pipelineName))
            .catch((e) => {
              response.errors.push({
                error: e?.meta?.body?.error ?? e,
                status: e?.meta?.body?.status,
                name: pipelineName,
              });
            });
        })
      );

      return res.ok({ body: response });
    }
  );
};
