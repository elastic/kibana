/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

const bodySchema = schema.object({}, { unknowns: 'allow' });

export function registerSimulateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/index_templates/simulate/{templateName?}'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        body: schema.nullable(bodySchema),
        params: schema.object({ templateName: schema.maybe(schema.string()) }),
      },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const template = request.body as TypeOf<typeof bodySchema>;
      // Until ES fixes a bug on their side we need to send a fake index pattern
      // that won't match any indices.
      // Issue: https://github.com/elastic/elasticsearch/issues/59152
      // eslint-disable-next-line @typescript-eslint/naming-convention
      const index_patterns = ['a_fake_index_pattern_that_wont_match_any_indices'];
      const templateName = request.params.templateName;

      const params: estypes.IndicesSimulateTemplateRequest = templateName
        ? {
            name: templateName,
          }
        : {
            ...template,
            index_patterns,
          };

      try {
        const templatePromise = client.asCurrentUser.indices.getIndexTemplate({
          name: templateName!,
        });
        const templatePreviewPromise = client.asCurrentUser.indices.simulateTemplate(params);
        const settingsPromise = client.asInternalUser.cluster.getSettings({
          include_defaults: true,
        });

        const [templateContent, templatePreview, { persistent, defaults }] = await Promise.all([
          templatePromise,
          templatePreviewPromise,
          settingsPromise,
        ]);

        const isLogsPattern = !!templateContent.index_templates.find((t) =>
          // @ts-expect-error I think there are some incorrect types from the es client package
          t.index_template.index_patterns?.some((pattern) => pattern === 'logs-*-*')
        );

        const isLogsdbEnabled =
          (persistent?.cluster?.logsdb?.enabled ?? defaults?.cluster?.logsdb?.enabled) === 'true';

        templatePreview.template.settings.index = templatePreview.template.settings.index || {};

        templatePreview.template.settings.index.mode =
          templatePreview.template.settings.index.mode ||
          (isLogsdbEnabled && isLogsPattern ? 'logsdb' : 'standard');

        return response.ok({ body: templatePreview });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
