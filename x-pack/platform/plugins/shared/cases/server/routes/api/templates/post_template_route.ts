/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { CreateTemplateInputSchema } from '../../../../common/types/domain/template/v1';
import { INTERNAL_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
import { parseTemplate } from './parse_template';
import { validateTemplateDefinition } from './validate_template_input';

/**
 * POST /internal/cases/templates
 * Create a new template
 */
export const postTemplateRoute = createCasesRoute({
  method: 'post',
  path: INTERNAL_TEMPLATES_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Create a new case template',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const input = CreateTemplateInputSchema.parse(request.body);

      const definitionValidation = validateTemplateDefinition(input.definition);
      if (!definitionValidation.valid) {
        return response.badRequest({ body: { message: definitionValidation.message } });
      }

      const template = await casesClient.templates.createTemplate(input);
      const parsedTemplate = parseTemplate(template.attributes);

      return response.ok({
        body: parsedTemplate,
      });
    } catch (error) {
      if (isBoom(error) && error.output.statusCode === 409) {
        return response.conflict({
          body: { message: error.message },
        });
      }

      throw createCaseError({
        message: `Failed to create template: ${error}`,
        error,
      });
    }
  },
});
