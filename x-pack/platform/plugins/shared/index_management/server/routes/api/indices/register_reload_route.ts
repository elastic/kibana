/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { schema } from '@kbn/config-schema';

import { MAX_INDICES_PER_REQUEST } from '../../../../common/constants';
import { RouteDependencies } from '../../../types';
import { fetchIndices } from '../../../lib/fetch_indices';
import { addBasePath } from '..';

const bodySchema = schema.maybe(
  schema.object({
    indexNames: schema.maybe(schema.arrayOf(schema.string())),
  })
);

export function registerReloadRoute({
  router,
  indexDataEnricher,
  lib: { handleEsError },
  config,
}: RouteDependencies) {
  router.post(
    { path: addBasePath('/indices/reload'), validate: { body: bodySchema } },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { indexNames = [] } = (request.body as typeof bodySchema.type) ?? {};

      try {
        let indices;

        // When the number of indices is small, we can execute in a single request
        //
        // Otherwise we need to split the indices into chunks and execute them in multiple requests because
        // if we try to execute an action with too many indices that account for a long string in the request
        // ES will throw an error saying that the HTTP line is too large.
        if (indexNames.length <= MAX_INDICES_PER_REQUEST) {
          indices = await fetchIndices({ client, indexDataEnricher, config, indexNames });
        } else {
          const chunks = chunk(indexNames, MAX_INDICES_PER_REQUEST);

          indices = (
            await Promise.all(
              chunks.map((indexNamesChunk) =>
                fetchIndices({ client, indexDataEnricher, config, indexNames: indexNamesChunk })
              )
            )
          ).flat();
        }

        return response.ok({ body: indices });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
