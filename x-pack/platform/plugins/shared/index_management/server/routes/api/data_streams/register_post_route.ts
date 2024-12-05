/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { IScopedClusterClient } from '@kbn/core/server';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

const getDataStreams = (client: IScopedClusterClient, name = '*') => {
  return client.asCurrentUser.indices.getDataStream({
    name,
    expand_wildcards: 'all',
  });
};

export function registerPostOneApplyLatestMappings({
  router,
  lib: { handleEsError },
  config,
}: RouteDependencies) {
  const paramsSchema = schema.object({
    name: schema.string(),
  });
  router.post(
    {
      path: addBasePath('/data_streams/{name}/mappings_from_template'),
      validate: { params: paramsSchema },
    },
    async (context, request, response) => {
      const { name } = request.params as TypeOf<typeof paramsSchema>;
      const { client } = (await context.core).elasticsearch;
      try {
        const { data_streams: dataStreams } = await getDataStreams(client, name);
        // The API is meant to be used only for applying the mapping to one specific datastream
        if (dataStreams[0]) {
          const { template } = dataStreams[0];
          const simulateResult = await client.asCurrentUser.indices.simulateTemplate({
            name: template,
          });

          const mappings = simulateResult.template.mappings;
          // for now, remove from object so as not to update stream or data stream properties of the index until type and name
          // are added in https://github.com/elastic/kibana/issues/66551.  namespace value we will continue
          // to skip updating and assume the value in the index mapping is correct
          if (mappings && mappings.properties) {
            delete mappings.properties.stream;
            delete mappings.properties.data_stream;
          }
          await client.asCurrentUser.indices.putMapping({
            index: name,
            body: mappings || {},
            write_index_only: true,
          });

          return response.ok({ body: { success: true } });
        }

        return response.notFound();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}

export function registerPostOneRollover({
  router,
  lib: { handleEsError },
  config,
}: RouteDependencies) {
  const paramsSchema = schema.object({
    name: schema.string(),
  });
  router.post(
    {
      path: addBasePath('/data_streams/{name}/rollover'),
      validate: { params: paramsSchema },
    },
    async (context, request, response) => {
      const { name } = request.params as TypeOf<typeof paramsSchema>;
      const { client } = (await context.core).elasticsearch;
      try {
        const { data_streams: dataStreams } = await getDataStreams(client, name);
        // That API is mean to be used to rollover one specific datastream
        if (dataStreams[0]) {
          await client.asCurrentUser.indices.rollover({
            alias: name,
          });

          return response.ok({ body: { success: true } });
        }

        return response.notFound();
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
