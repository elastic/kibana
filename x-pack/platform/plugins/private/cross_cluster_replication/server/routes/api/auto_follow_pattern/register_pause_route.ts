/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Pause auto-follow pattern(s)
 */
export const registerPauseRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  const paramsSchema = schema.object({
    id: schema.string(),
  });

  router.post(
    {
      path: addBasePath('/auto_follow_patterns/{id}/pause'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { id } = request.params;
      const ids = id.split(',');

      const itemsPaused: string[] = [];
      const errors: Array<{ id: string; error: any }> = [];

      await Promise.all(
        ids.map((_id) =>
          client.asCurrentUser.ccr
            .pauseAutoFollowPattern({
              name: _id,
            })
            .then(() => itemsPaused.push(_id))
            .catch((error) => {
              errors.push({ id: _id, error: handleEsError({ error, response }) });
            })
        )
      );

      return response.ok({
        body: {
          itemsPaused,
          errors,
        },
      });
    })
  );
};
