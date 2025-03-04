/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

export const registerCreateRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  router.put(
    {
      path: addBasePath('/create'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        body: schema.object({
          job: schema.object(
            {
              id: schema.string({ maxLength: 1000 }),
            },
            { unknowns: 'allow' }
          ),
        }),
      },
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client: clusterClient } = (await context.core).elasticsearch;
      try {
        const { id } = request.body.job;
        // Create job.
        // @ts-expect-error elasticsearch@9.0.0 missing mandatory fields like cron, groups, index_pattern, page_size, rollup_index
        await clusterClient.asCurrentUser.rollup.putJob(request.body.job);
        // Then request the newly created job.
        const results = await clusterClient.asCurrentUser.rollup.getJobs({ id });
        return response.ok({ body: results.jobs[0] });
      } catch (err) {
        return handleEsError({ error: err, response });
      }
    })
  );
};
