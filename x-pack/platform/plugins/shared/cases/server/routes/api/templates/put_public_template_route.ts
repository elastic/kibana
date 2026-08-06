/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { isBoom } from '@hapi/boom';
import type { TemplateV2Response } from '../../../../common/bundled-types.gen';
import { CASE_TEMPLATE_DETAILS_URL, MAX_TEMPLATE_KEY_LENGTH } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { parseTemplate } from './parse_template';
import { validateTemplateDefinition } from './validate_template_input';
import { PublicTemplateWriteBodySchema } from './public_template_write_body';

/**
 * PUT /api/cases/templates/{template_id}
 * Public route — full replacement of a template. Every accepted write creates a new template
 * version; previous versions stay retrievable via `GET ...?version=`. `dry_run=true` runs the
 * full authorization + body + name-uniqueness validation without writing anything.
 */
export const putPublicTemplateRoute = createCasesRoute({
  method: 'put',
  path: CASE_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
    summary: 'Update a case template',
    tags: ['oas-tag:cases'],
  },
  params: {
    params: schema.object({
      template_id: schema.string({ maxLength: MAX_TEMPLATE_KEY_LENGTH }),
    }),
    query: schema.object({
      dry_run: schema.boolean({ defaultValue: false }),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const { template_id: templateId } = request.params;
      const bodyResult = PublicTemplateWriteBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return response.badRequest({
          body: { message: `Invalid request body: ${JSON.stringify(bodyResult.error.issues)}` },
        });
      }
      const input = bodyResult.data;

      const definitionValidation = validateTemplateDefinition(input.definition);
      if (!definitionValidation.valid) {
        return response.badRequest({ body: { message: definitionValidation.message } });
      }

      if (request.query.dry_run) {
        await casesClient.templates.validateUpdateTemplate(templateId, input);
        return response.ok({ body: { valid: true } });
      }

      const template = await casesClient.templates.updateTemplate(templateId, input);
      const body: TemplateV2Response = parseTemplate(template.attributes);

      return response.ok({ body });
    } catch (error) {
      if (isBoom(error) && error.output.statusCode === 409) {
        return response.conflict({ body: { message: error.message } });
      }
      if (isBoom(error) && error.output.statusCode === 404) {
        return response.notFound({ body: { message: error.message } });
      }

      throw createCaseError({
        message: `Failed to update template: ${error}`,
        error,
      });
    }
  },
});
