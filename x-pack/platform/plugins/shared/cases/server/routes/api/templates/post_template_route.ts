/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import {
  type Template,
  CreateTemplateInputSchema,
} from '../../../../common/types/domain/template/v1';
import { INTERNAL_TEMPLATES_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { mockTemplates } from './mock_data';
import { parseTemplate } from './parse_template';

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
      await caseContext.getCasesClient();

      const input = CreateTemplateInputSchema.parse(request.body);

      // Validate YAML definition can be parsed
      try {
        yaml.load(input.definition);
      } catch (yamlError) {
        return response.badRequest({
          body: { message: `Invalid YAML definition: ${yamlError}` },
        });
      }

      // Generate new template ID and create template
      const newTemplateId = `template-${Date.now()}`;
      const newTemplate: Template = {
        templateId: newTemplateId,
        name: input.name,
        owner: input.owner,
        definition: input.definition,
        templateVersion: 1,
        deletedAt: null,
      };

      // Add to mock store
      mockTemplates.push(newTemplate);

      const parsedTemplate = parseTemplate(newTemplate);

      return response.ok({
        body: parsedTemplate,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to create template: ${error}`,
        error,
      });
    }
  },
});
