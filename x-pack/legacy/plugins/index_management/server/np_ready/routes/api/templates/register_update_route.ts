/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

import { Template, TemplateEs } from '../../../../../common/types';
import { serializeTemplate } from '../../../../../common/lib';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';
import { templateSchema } from './validate_schemas';

const bodySchema = templateSchema;
const paramsSchema = schema.object({
  name: schema.string(),
});

export function registerUpdateRoute({ router }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/templates/{name}'),
      validate: { body: bodySchema, params: paramsSchema },
    },
    async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.dataClient;
      const { name } = req.params;
      const template = req.body as Template;
      const serializedTemplate = serializeTemplate(template) as TemplateEs;

      const { order, index_patterns, version, settings, mappings, aliases } = serializedTemplate;

      // Verify the template exists (ES will throw 404 if not)
      const doesExist = await callAsCurrentUser('indices.existsTemplate', { name });

      if (!doesExist) {
        return res.notFound();
      }

      // Next, update index template
      const response = await callAsCurrentUser('indices.putTemplate', {
        name,
        order,
        body: {
          index_patterns,
          version,
          settings,
          mappings,
          aliases,
        },
      });

      return res.ok({ body: response });
    }
  );
}
