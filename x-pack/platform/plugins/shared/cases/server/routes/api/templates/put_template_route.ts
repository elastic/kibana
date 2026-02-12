/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import yaml from 'js-yaml';
import {
  UpdateTemplateInputSchema,
  type Template,
} from '../../../../common/types/domain/template/v1';
import { INTERNAL_TEMPLATE_DETAILS_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';
// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { mockTemplates } from './mock_data';
import { parseTemplate } from './parse_template';

/**
 * PUT /internal/cases/templates/{template_id}
 * Full update of a template (creates a new version)
 */
export const putTemplateRoute = createCasesRoute({
  method: 'put',
  path: INTERNAL_TEMPLATE_DETAILS_URL,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'internal',
    summary: 'Update a case template (full replacement)',
  },
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      await caseContext.getCasesClient();

      const { template_id: templateId } = request.params;
      const input = UpdateTemplateInputSchema.parse(request.body);

      // Find the latest version of the template
      const existingVersions = mockTemplates.filter(
        (t) => t.templateId === templateId && t.deletedAt === null
      );

      if (existingVersions.length === 0) {
        return response.notFound({
          body: { message: `Template with id ${templateId} not found` },
        });
      }

      // Validate YAML definition
      try {
        yaml.load(input.definition);
      } catch (yamlError) {
        return response.badRequest({
          body: { message: `Invalid YAML definition: ${yamlError}` },
        });
      }

      const latestVersion = Math.max(...existingVersions.map((t) => t.templateVersion));

      // Create new version
      const updatedTemplate: Template = {
        templateId,
        name: input.name,
        owner: input.owner,
        definition: input.definition,
        templateVersion: latestVersion + 1,
        deletedAt: null,
      };

      mockTemplates.push(updatedTemplate);

      const parsedTemplate = parseTemplate(updatedTemplate);

      return response.ok({
        body: parsedTemplate,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update template: ${error}`,
        error,
      });
    }
  },
});
