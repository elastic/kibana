/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { estypes } from '@elastic/elasticsearch';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';
import { componentTemplateSchema } from './schema_validation';

const paramsSchema = schema.object({
  name: schema.string(),
});

export const registerUpdateRoute = ({
  router,
  lib: { handleEsError },
}: RouteDependencies): void => {
  router.put(
    {
      path: addBasePath('/component_templates/{name}'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        body: componentTemplateSchema,
        params: paramsSchema,
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { name } = request.params;
      const { template, version, _meta, deprecated } = request.body;

      try {
        // Verify component exists; ES will throw 404 if not
        const existingComponentTemplate = await client.asCurrentUser.transport.request<{
          component_templates?: Array<{
            component_template?: { template?: { data_stream_options?: unknown } };
          }>;
        }>({
          method: 'GET',
          path: `/_component_template/${name}`,
        });
        // TBD: Replace with the following when the client includes data_stream_options in ClusterComponentTemplateSummary
        // const existingComponentTemplate = await client.asCurrentUser.cluster.getComponentTemplate({
        //   name,
        // });
        const existingDataStreamOptions =
          existingComponentTemplate?.component_templates?.[0]?.component_template?.template
            ?.data_stream_options ?? undefined;

        // If the existing component template contains data stream options, we need to persist them.
        // Otherwise, they will be lost when the component template is updated.
        const updatedTemplate = {
          ...template,
          ...(existingDataStreamOptions && { data_stream_options: existingDataStreamOptions }),
        };

        const responseBody = await client.asCurrentUser.cluster.putComponentTemplate({
          name,
          template: updatedTemplate as estypes.IndicesIndexState,
          version,
          _meta,
          deprecated,
        });

        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
};
