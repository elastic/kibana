/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

/** HTTP Warning headers have the following syntax:
 * <warn-code> <warn-agent> <warn-text> (where warn-code is a three-digit number)
 * This function only returns the warn-text if it exists.
 * */
export const getEsWarningText = (warning: string): string | null => {
  const match = warning.match(/\d{3} Elasticsearch-\w+ "(.*)"/);
  return match ? match[1] : null;
};

export function registerPutDataRetention({ router, lib: { handleEsError } }: RouteDependencies) {
  const bodySchema = schema.object({
    dataStreams: schema.arrayOf(schema.string()),
    dataRetention: schema.maybe(schema.string()),
    enabled: schema.maybe(schema.boolean()),
  });

  router.put(
    {
      path: addBasePath('/data_streams/data_retention'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const { dataStreams, dataRetention, enabled } = request.body as TypeOf<typeof bodySchema>;

      const { client } = (await context.core).elasticsearch;

      try {
        // Only when enabled is explicitly set to false, we delete the data retention policy.
        if (enabled === false) {
          await client.asCurrentUser.indices.deleteDataLifecycle({ name: dataStreams });
        } else {
          // Otherwise, we create or update the data retention policy.
          //
          // Be aware that in serverless it could happen that the user defined
          // data retention wont be the effective retention as there might be a
          // global data retention limit set.
          const { headers } = await client.asCurrentUser.indices.putDataLifecycle(
            {
              name: dataStreams,
              data_retention: dataRetention,
            },
            { meta: true }
          );

          return response.ok({
            body: {
              success: true,
              ...(headers?.warning
                ? { warning: getEsWarningText(headers.warning) ?? headers.warning }
                : {}),
            },
          });
        }

        return response.ok({ body: { success: true } });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
