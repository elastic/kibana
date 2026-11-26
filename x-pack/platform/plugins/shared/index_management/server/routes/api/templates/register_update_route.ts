/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { TemplateDeserialized } from '../../../../common';
import type { RouteDependencies } from '../../../types';
import { addBasePath } from '..';
import { templateSchema } from './validate_schemas';
import { saveTemplate, doesTemplateExist, getTemplateDataStreamOptions } from './lib';

const bodySchema = templateSchema;
const paramsSchema = schema.object({
  name: schema.string({ maxLength: 1000 }),
});

export function registerUpdateRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.put(
    {
      path: addBasePath('/index_templates/{name}'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: { body: bodySchema, params: paramsSchema },
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { name } = request.params as typeof paramsSchema.type;
      const { template: bodyTemplate, ...restOfBody } = request.body as TemplateDeserialized;
      // The UI sends the full template (e.g. when editing), but data_stream_options is
      // always read from the existing template in ES, so the client value is ignored.
      const { data_stream_options: _ignored, ...templateWithoutDsOptions } = bodyTemplate ?? {};
      const template: TemplateDeserialized = {
        ...restOfBody,
        ...(bodyTemplate && { template: templateWithoutDsOptions }),
      };

      try {
        const {
          _kbnMeta: { isLegacy },
        } = template;

        // Verify the template exists (ES will throw 404 if not)
        const templateExists = await doesTemplateExist({ name, client, isLegacy });

        if (!templateExists) {
          return response.notFound();
        }

        // ES rejects data_stream_options on templates that are not data stream templates,
        // so only re-apply the stored options when the template has a data stream.
        const dataStreamOptions = template.dataStream
          ? await getTemplateDataStreamOptions({
              name,
              client,
              isLegacy,
            })
          : undefined;

        // Next, update index template
        const responseBody = await saveTemplate({
          template,
          client,
          isLegacy,
          dataStreamOptions,
        });

        return response.ok({ body: responseBody });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
}
