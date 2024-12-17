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
 * Unfollow follower index's leader index
 */
export const registerUnfollowRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  const paramsSchema = schema.object({ id: schema.string() });

  router.put(
    {
      path: addBasePath('/follower_indices/{id}/unfollow'),
      validate: {
        params: paramsSchema,
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { id } = request.params;
      const ids = id.split(',');

      const itemsUnfollowed: string[] = [];
      const itemsNotOpen: string[] = [];
      const errors: Array<{ id: string; error: any }> = [];

      await Promise.all(
        ids.map(async (_id: string) => {
          try {
            // Try to pause follower, let it fail silently since it may already be paused
            try {
              await client.asCurrentUser.ccr.pauseFollow({ index: _id });
            } catch (e) {
              // Swallow errors
            }

            // Close index
            await client.asCurrentUser.indices.close({ index: _id });

            // Unfollow leader
            await client.asCurrentUser.ccr.unfollow({ index: _id });

            // Try to re-open the index, store failures in a separate array to surface warnings in the UI
            // This will allow users to query their index normally after unfollowing
            try {
              await client.asCurrentUser.indices.open({ index: _id });
            } catch (e) {
              itemsNotOpen.push(_id);
            }

            // Push success
            itemsUnfollowed.push(_id);
          } catch (error) {
            errors.push({ id: _id, error: handleEsError({ error, response }) });
          }
        })
      );

      return response.ok({
        body: {
          itemsUnfollowed,
          itemsNotOpen,
          errors,
        },
      });
    })
  );
};
