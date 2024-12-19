/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import { RouteDependencies } from '../../../types';
import { addBasePath } from '..';

import { TemplateDeserialized } from '../../../../common';

const bodySchema = schema.object({
  templates: schema.arrayOf(
    schema.object({
      name: schema.string(),
      isLegacy: schema.maybe(schema.boolean()),
    })
  ),
});

export function registerDeleteRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.post(
    {
      path: addBasePath('/delete_index_templates'),
      validate: { body: bodySchema },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { templates } = request.body as TypeOf<typeof bodySchema>;
      const responseBody: {
        templatesDeleted: Array<TemplateDeserialized['name']>;
        errors: any[];
      } = {
        templatesDeleted: [],
        errors: [],
      };

      await Promise.all(
        templates.map(async ({ name, isLegacy }) => {
          try {
            if (isLegacy) {
              await client.asCurrentUser.indices.deleteTemplate({
                name,
              });
            } else {
              await client.asCurrentUser.indices.deleteIndexTemplate({
                name,
              });
            }

            return responseBody.templatesDeleted.push(name);
          } catch (error) {
            return responseBody.errors.push({
              name,
              error: handleEsError({ error, response }),
            });
          }
        })
      );

      return response.ok({ body: responseBody });
    }
  );
}
