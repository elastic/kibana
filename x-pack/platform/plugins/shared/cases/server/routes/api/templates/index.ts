/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  ISavedObjectsSerializer,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { v4 } from 'uuid';
import { fromKueryExpression } from '@kbn/es-query';
import type { CreateTemplateInput, Template } from '../../../../common/templates';
import { CASE_TEMPLATE_SAVED_OBJECT, CASES_INTERNAL_URL } from '../../../../common/constants';
import { createCaseError } from '../../../common/error';
import { createCasesRoute } from '../create_cases_route';
import { DEFAULT_CASES_ROUTE_SECURITY } from '../constants';

// TODO: split this into multiple files, add rbac, security, make this api internal etc etc

// Services

export class TemplatesService {
  constructor(
    private readonly dependencies: {
      unsecuredSavedObjectsClient: SavedObjectsClientContract;
      savedObjectsSerializer: ISavedObjectsSerializer;
    }
  ) {}

  async getAllTemplates() {
    const findResult = await this.dependencies.unsecuredSavedObjectsClient.find<Template>({
      type: CASE_TEMPLATE_SAVED_OBJECT,
      filter: fromKueryExpression(`NOT ${CASE_TEMPLATE_SAVED_OBJECT}.attributes.deletedAt: *`),
      aggs: {
        by_template: {
          terms: {
            field: `${CASE_TEMPLATE_SAVED_OBJECT}.attributes.templateId`,
            size: 10000,
          },
          aggregations: {
            latest_template: {
              top_hits: {
                size: 1,
                sort: [
                  {
                    [`${CASE_TEMPLATE_SAVED_OBJECT}.attributes.templateVersion`]: { order: 'desc' },
                  },
                ],
              },
            },
          },
        },
      },
    });

    return findResult.saved_objects.map(({ attributes }) => attributes);
  }

  async getTemplate(templateId: string) {}

  async createTemplate(input: CreateTemplateInput): Promise<SavedObject<Template>> {
    const templateSavedObject = await this.dependencies.unsecuredSavedObjectsClient.create(
      CASE_TEMPLATE_SAVED_OBJECT,
      {
        templateVersion: 1,
        deletedAt: null,
        definition: input.definition,
        name: input.name,
        templateId: v4(),
      } as Template
    );

    return templateSavedObject;
  }

  async updateTemplate() {}

  async deleteTemplate() {}
}

// TODO:
// 1. add crud methods for yaml persistence
// 2. add yaml editor for persistence
// 3. add new fields to a case - templateFields and templateId
// 4. add validate method to check case fields against the template
// 5. add case rendering based on the template

// Routes

export const postTemplateRoute = createCasesRoute({
  method: 'post',
  path: `${CASES_INTERNAL_URL}/templates`,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      await casesClient.templates.createTemplate(request.body as CreateTemplateInput);

      return response.ok({
        body: {},
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to post template`,
        error,
      });
    }
  },
});

export const getTemplatesRoute = createCasesRoute({
  method: 'get',
  path: `${CASES_INTERNAL_URL}/templates`,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const templatesResult = await casesClient.templates.getAllTemplates();

      return response.ok({
        body: templatesResult,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get templates`,
        error,
      });
    }
  },
});

export const getTemplateRoute = createCasesRoute({
  method: 'get',
  path: `${CASES_INTERNAL_URL}/templates/{template_id}`,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  routerOptions: {
    access: 'public',
  },
  handler: async ({ context, request, response }) => {
    const templates: Template[] = [];

    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      casesClient.templates.getAllTemplates();

      return response.ok({
        body: templates,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to get templates`,
        error,
      });
    }
  },
});

export const updateTemplateRoute = createCasesRoute({
  method: 'patch',
  path: `${CASES_INTERNAL_URL}/templates/{template_id}`,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'public',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const templateId = request.params.template_id;

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete template, id: ${request.params.template_id}: ${error}`,
        error,
      });
    }
  },
});

// NOTE: soft delete only as this would break existing cases using the template
export const deleteTemplateRoute = createCasesRoute({
  method: 'delete',
  path: `${CASES_INTERNAL_URL}/templates/{template_id}`,
  security: DEFAULT_CASES_ROUTE_SECURITY,
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
  },
  routerOptions: {
    access: 'public',
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();
      const templateId = request.params.template_id;

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete template, id: ${request.params.template_id}: ${error}`,
        error,
      });
    }
  },
});
