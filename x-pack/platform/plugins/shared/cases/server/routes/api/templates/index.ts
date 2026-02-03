/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  ElasticsearchClient,
  ISavedObjectsSerializer,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { v4 } from 'uuid';
import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { load as parseYaml } from 'js-yaml';
import type {
  CreateTemplateInput,
  ParsedTemplate,
  Template,
  UpdateTemplateInput,
} from '../../../../common/templates';
import {
  CASE_EXTENDED_FIELDS,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASES_INTERNAL_URL,
} from '../../../../common/constants';
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
      internalEsClient: ElasticsearchClient;
    }
  ) {}

  async getAllTemplates(filterById?: string, version?: string) {
    interface SearchResult {
      aggregations: {
        by_template: {
          buckets: Array<{
            latest_template: {
              hits: {
                hits: Array<{ _source: { [CASE_TEMPLATE_SAVED_OBJECT]: Template } }>;
              };
            };
          }>;
        };
      };
    }

    if (version) {
      console.log('getAllTemplates, filtered by version', version);
    }

    const findResult = (await this.dependencies.unsecuredSavedObjectsClient.search({
      namespaces: ['*'],
      type: CASE_TEMPLATE_SAVED_OBJECT,
      query: {
        bool: {
          filter: [
            toElasticsearchQuery(
              fromKueryExpression(`NOT ${CASE_TEMPLATE_SAVED_OBJECT}.deletedAt: *`)
            ),
            ...(filterById
              ? [
                  toElasticsearchQuery(
                    fromKueryExpression(`${CASE_TEMPLATE_SAVED_OBJECT}.templateId: "${filterById}"`)
                  ),
                ]
              : []),
            ...(version
              ? [
                  toElasticsearchQuery(
                    fromKueryExpression(
                      `${CASE_TEMPLATE_SAVED_OBJECT}.templateVersion: "${version}"`
                    )
                  ),
                ]
              : []),
          ],
        },
      },
      aggs: {
        by_template: {
          terms: {
            field: `${CASE_TEMPLATE_SAVED_OBJECT}.templateId`,
            size: 10000,
          },
          aggs: {
            latest_template: {
              top_hits: {
                size: 1,
                sort: [
                  {
                    [`${CASE_TEMPLATE_SAVED_OBJECT}.templateVersion`]: { order: 'desc' },
                  },
                ],
              },
            },
          },
        },
      },
    })) as SearchResult;

    const latestTemplateVersions = findResult.aggregations.by_template.buckets.flatMap((bucket) =>
      bucket.latest_template.hits?.hits?.map((hit) => ({
        ...hit._source[CASE_TEMPLATE_SAVED_OBJECT],
      }))
    );

    return latestTemplateVersions;
  }

  async getTemplate(templateId: string, version?: string): Promise<Template | undefined> {
    return (await this.getAllTemplates(templateId, version))[0];
  }

  async updateMappings(definition: string) {
    const parsedDefinition = parseYaml(definition) as ParsedTemplate['definition'];

    const updatedMappings = {
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      properties: {
        cases: {
          properties: {
            [CASE_EXTENDED_FIELDS]: {
              properties: parsedDefinition.fields.reduce((acc, field) => {
                acc[[field.name, field.type].join('_as_')] = {
                  type: field.type,
                };

                return acc;
              }, {} as Record<string, { type: string }>) as any,
            },
          },
        },
      },
    };

    await this.dependencies.internalEsClient.indices.putMapping(updatedMappings);
  }

  async createTemplate(input: CreateTemplateInput): Promise<SavedObject<Template>> {
    const templateSavedObject = await this.dependencies.unsecuredSavedObjectsClient.create(
      CASE_TEMPLATE_SAVED_OBJECT,
      {
        templateVersion: 1,
        deletedAt: null,
        definition: input.definition,
        name: input.name,
        templateId: v4(),
      } as Template,
      { refresh: true }
    );

    await this.updateMappings(input.definition);

    return templateSavedObject;
  }

  async updateTemplate(templateId: string, input: UpdateTemplateInput) {
    const currentTemplate = await this.getTemplate(templateId);

    if (!currentTemplate) {
      throw new Error('template does not exist');
    }

    const templateSavedObject = await this.dependencies.unsecuredSavedObjectsClient.create(
      CASE_TEMPLATE_SAVED_OBJECT,
      {
        templateVersion: currentTemplate.templateVersion + 1,
        definition: input.definition,
        name: input.name,
        templateId: currentTemplate.templateId,
        deletedAt: null,
      },
      {
        refresh: true,
      }
    );

    await this.updateMappings(input.definition);

    return templateSavedObject;
  }

  // NOTE: marks all versions (snapshots) as deleted also
  async deleteTemplate(templateId: string) {
    const templateSnapshots = await this.dependencies.unsecuredSavedObjectsClient.find({
      type: CASE_TEMPLATE_SAVED_OBJECT,
      filter: fromKueryExpression(
        `${CASE_TEMPLATE_SAVED_OBJECT}.attributes.templateId: "${templateId}"`
      ),
      perPage: 10000,
      page: 1,
    });

    const ids = templateSnapshots.saved_objects.map((so) => so.id);

    await this.dependencies.unsecuredSavedObjectsClient.bulkUpdate(
      ids.map((id) => ({
        id,
        type: CASE_TEMPLATE_SAVED_OBJECT,
        attributes: {
          deletedAt: new Date().toISOString(),
        },
      })),
      { refresh: true }
    );
  }
}

// TODO:
// 3. add new fields to a case - extendedFields and templateId
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
  params: {
    params: schema.object({
      template_id: schema.string(),
    }),
  },
  handler: async ({ context, request, response }) => {
    try {
      const caseContext = await context.cases;
      const casesClient = await caseContext.getCasesClient();

      const requestedTemplate = await casesClient.templates.getTemplate(
        request.params.template_id,
        (request.query as Record<string, string | undefined>).version
      );

      if (requestedTemplate) {
        const res: Template & { isLatest: boolean; latestVersion: number } = {
          ...requestedTemplate,
          isLatest: true,
          latestVersion: requestedTemplate.templateVersion,
        };

        const latestTemplate = await casesClient.templates.getTemplate(request.params.template_id);
        res.isLatest = latestTemplate?.templateVersion === requestedTemplate?.templateVersion;
        res.latestVersion = latestTemplate?.templateVersion ?? requestedTemplate.templateVersion;

        return response.ok({
          body: res,
        });
      }

      return response.notFound();
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

      await casesClient.templates.updateTemplate(templateId, request.body as UpdateTemplateInput);

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to update template, id: ${request.params.template_id}: ${error}`,
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

      await casesClient.templates.deleteTemplate(templateId);

      return response.noContent();
    } catch (error) {
      throw createCaseError({
        message: `Failed to delete template, id: ${request.params.template_id}: ${error}`,
        error,
      });
    }
  },
});
