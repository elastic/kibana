/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { estypes } from '@elastic/elasticsearch';

import { DataStreamOptions } from '../../../../common/types/data_streams';
import { serializeComponentTemplate } from '../../../../common/lib';
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
        // TODO: Replace with the following when the client includes data_stream_options in ClusterComponentTemplateSummary
        // https://github.com/elastic/kibana/issues/220614
        // const existingComponentTemplate = await client.asCurrentUser.cluster.getComponentTemplate({
        //   name,
        // });
        const existingDataStreamOptions =
          existingComponentTemplate?.component_templates?.[0]?.component_template?.template
            ?.data_stream_options ?? undefined;

        const serializedComponentTemplate = serializeComponentTemplate(
          request.body,
          existingDataStreamOptions as DataStreamOptions | undefined
        );

        const responseBody = await client.asCurrentUser.cluster.putComponentTemplate({
          name,
          ...serializedComponentTemplate,
          template: serializedComponentTemplate.template as estypes.IndicesIndexState,
        });

        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
};
