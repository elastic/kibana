/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { RouteDependencies } from '../../../types';
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
    dataStreams: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
    dataRetention: schema.maybe(schema.string({ maxLength: 1000 })),
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

export function registerPutDataStreamFailureStore({
  router,
  lib: { handleEsError },
  config,
}: RouteDependencies) {
  const bodySchema = schema.object(
    {
      dataStreams: schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 1000 }),
      dsFailureStore: schema.boolean(),
      customRetentionPeriod: schema.maybe(schema.string({ maxLength: 1000 })),
      retentionDisabled: schema.maybe(schema.boolean()),
    },
    {
      validate: (value) => {
        // Enforce mutual exclusivity between custom retention and disabled retention
        if (value.customRetentionPeriod && value.retentionDisabled) {
          return 'Cannot specify both customRetentionPeriod and retentionDisabled';
        }
      },
    }
  );

  router.put(
    {
      path: addBasePath('/data_streams/configure_failure_store'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const { dataStreams, dsFailureStore, customRetentionPeriod, retentionDisabled } =
        request.body as TypeOf<typeof bodySchema>;

      const { client } = (await context.core).elasticsearch;

      // Build lifecycle configuration for failure store
      const buildFailureStoreLifecycle = () => {
        // Case 1: Enable lifecycle with custom retention period
        // Schema validation ensures customRetentionPeriod and retentionDisabled are mutually exclusive
        if (customRetentionPeriod) {
          return {
            lifecycle: {
              enabled: true,
              data_retention: customRetentionPeriod,
            },
          };
        }

        // Case 2: Explicitly disable lifecycle retention (feature-flagged)
        if (retentionDisabled && config.enableFailureStoreRetentionDisabling) {
          return {
            lifecycle: {
              enabled: false,
            },
          };
        }

        // Case 3: No lifecycle configuration (use cluster defaults)
        return {};
      };

      try {
        // Configure failure store for each data stream
        const promises = dataStreams.map(async (dataStreamName) => {
          const { headers } = await client.asCurrentUser.indices.putDataStreamOptions(
            {
              name: dataStreamName,
              failure_store: {
                enabled: dsFailureStore,
                ...(dsFailureStore && buildFailureStoreLifecycle()),
              },
            },
            { meta: true }
          );
          return headers;
        });

        const results = await Promise.all(promises);
        const warnings = results
          .map((headers) =>
            headers?.warning ? getEsWarningText(headers.warning) ?? headers.warning : null
          )
          .filter(Boolean);

        return response.ok({
          body: {
            success: true,
            ...(warnings.length > 0 ? { warning: warnings.join('; ') } : {}),
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
