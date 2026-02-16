/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  ISavedObjectsSerializer,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsRawDoc,
} from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import { v4 } from 'uuid';
import { load as parseYaml } from 'js-yaml';
import type { MappingProperty, PropertyName } from '@elastic/elasticsearch/lib/api/types';
import type {
  CreateTemplateInput,
  ParsedTemplate,
  Template,
  UpdateTemplateInput,
} from '../../../common/types/domain/template/v1';
import { CASE_EXTENDED_FIELDS, CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import type {
  TemplatesFindRequest,
  TemplatesFindResponse,
} from '../../../common/types/api/template/v1';

export class TemplatesService {
  constructor(
    private readonly dependencies: {
      unsecuredSavedObjectsClient: SavedObjectsClientContract;
      savedObjectsSerializer: ISavedObjectsSerializer;
      esClient: ElasticsearchClient;
      internalClusterClient: ElasticsearchClient;
    }
  ) {}

  async getAllTemplates(params: TemplatesFindRequest): Promise<TemplatesFindResponse> {
    const {
      page,
      perPage,
      sortField = 'name',
      sortOrder = 'asc',
      search,
      tags,
      author,
      isDeleted,
    } = params;

    const { templates, total } = await this.searchTemplates({
      page,
      perPage,
      sortField,
      sortOrder,
      isDeleted,
      search,
      tags,
      author,
      isLatest: true,
    });

    return {
      templates: templates.map((so) => so.attributes),
      page,
      perPage,
      total,
    };
  }

  async getTemplate(
    templateId: string,
    version?: string
  ): Promise<SavedObject<Template> | undefined> {
    const { templates } = await this.searchTemplates({
      page: 1,
      perPage: 1,
      sortField: 'templateVersion',
      sortOrder: 'desc',
      templateId,
      version,
      ...(version === undefined ? { isLatest: true } : {}),
    });

    return templates[0];
  }

  /**
   * Fetches templates from ES using regular search.
   */
  private async searchTemplates({
    page,
    perPage,
    sortField,
    sortOrder,
    isDeleted = false,
    templateId,
    version,
    isLatest,
    search,
    tags,
    author,
  }: {
    page: number;
    perPage: number;
    sortField: TemplatesFindRequest['sortField'];
    sortOrder: TemplatesFindRequest['sortOrder'];
    isDeleted?: boolean;
    templateId?: string;
    version?: string;
    isLatest?: boolean;
    search?: string;
    tags?: string[];
    author?: string[];
  }): Promise<{ templates: Array<SavedObject<Template>>; total: number }> {
    interface SearchResult {
      hits: {
        hits: SavedObjectsRawDoc[];
        total: {
          value: number;
        };
      };
    }

    const SO = CASE_TEMPLATE_SAVED_OBJECT;

    const filters = [
      ...(isDeleted ? [] : [toElasticsearchQuery(fromKueryExpression(`NOT ${SO}.deletedAt: *`))]),
      ...(templateId
        ? [toElasticsearchQuery(fromKueryExpression(`${SO}.templateId: "${templateId}"`))]
        : []),
      ...(version
        ? [toElasticsearchQuery(fromKueryExpression(`${SO}.templateVersion: "${version}"`))]
        : []),
      ...(isLatest !== undefined
        ? [toElasticsearchQuery(fromKueryExpression(`${SO}.isLatest: ${isLatest}`))]
        : []),
      ...(tags && tags.length > 0
        ? [
            toElasticsearchQuery(
              fromKueryExpression(tags.map((tag) => `${SO}.tags: "${tag}"`).join(' OR '))
            ),
          ]
        : []),
      ...(author && author.length > 0
        ? [
            toElasticsearchQuery(
              fromKueryExpression(author.map((a) => `${SO}.author: "${a}"`).join(' OR '))
            ),
          ]
        : []),
    ];

    const must = search
      ? [
          {
            bool: {
              should: [
                { wildcard: { [`${SO}.name`]: { value: `*${search}*`, case_insensitive: true } } },
                {
                  match_phrase: {
                    [`${SO}.description`]: search,
                  },
                },
                {
                  wildcard: {
                    [`${SO}.fieldNames`]: { value: `*${search}*`, case_insensitive: true },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ]
      : [];

    const from = (page - 1) * perPage;

    const sort = [
      {
        [`${CASE_TEMPLATE_SAVED_OBJECT}.${sortField}`]: {
          order: sortOrder,
          missing: '_last',
        },
      },
      ...(sortField === 'templateId'
        ? []
        : [
            {
              [`${CASE_TEMPLATE_SAVED_OBJECT}.templateId`]: {
                order: 'asc' as const,
              },
            },
          ]),
    ];

    const findResult = (await this.dependencies.unsecuredSavedObjectsClient.search({
      namespaces: ['*'],
      type: CASE_TEMPLATE_SAVED_OBJECT,
      from,
      size: perPage,
      sort,
      query: {
        bool: {
          filter: filters,
          ...(must.length > 0 ? { must } : {}),
        },
      },
    })) as SearchResult;

    return {
      templates: findResult.hits.hits.map((hit) =>
        this.dependencies.savedObjectsSerializer.rawToSavedObject<Template>(hit)
      ),
      total: findResult.hits.total.value,
    };
  }

  private async updateMappings(definition: string) {
    const parsedDefinition = parseYaml(definition) as ParsedTemplate['definition'];

    await this.dependencies.internalClusterClient.indices.putMapping({
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
              }, {} as unknown as Record<PropertyName, MappingProperty>),
            },
          },
        },
      },
    });
  }

  async createTemplate(input: CreateTemplateInput): Promise<SavedObject<Template>> {
    const parsedDefinition = parseYaml(input.definition) as ParsedTemplate['definition'];

    const templateSavedObject = await this.dependencies.unsecuredSavedObjectsClient.create(
      CASE_TEMPLATE_SAVED_OBJECT,
      {
        templateVersion: 1,
        isLatest: true,
        deletedAt: null,
        definition: input.definition,
        name: parsedDefinition.name,
        owner: input.owner,
        templateId: v4(),
        description: input.description,
        tags: input.tags,
        author: input.author,
        fieldCount: parsedDefinition.fields.length,
        fieldNames: parsedDefinition.fields.map((f) => f.name),
      } as Template,
      { refresh: true }
    );

    await this.updateMappings(input.definition);

    return templateSavedObject;
  }

  async updateTemplate(
    templateId: string,
    input: UpdateTemplateInput
  ): Promise<SavedObject<Template>> {
    const currentTemplate = await this.getTemplate(templateId);

    if (!currentTemplate) {
      throw new Error('template does not exist');
    }

    const parsedDefinition = parseYaml(input.definition) as ParsedTemplate['definition'];

    const templateSavedObject = await this.dependencies.unsecuredSavedObjectsClient.create(
      CASE_TEMPLATE_SAVED_OBJECT,
      {
        templateVersion: currentTemplate.attributes.templateVersion + 1,
        isLatest: true,
        definition: input.definition,
        name: parsedDefinition.name,
        owner: input.owner,
        templateId: currentTemplate.attributes.templateId,
        deletedAt: null,
        description: input.description,
        tags: input.tags,
        author: input.author,
        fieldCount: parsedDefinition.fields.length,
        fieldNames: parsedDefinition.fields.map((f) => f.name),
      },
      {
        refresh: true,
      }
    );

    await this.dependencies.unsecuredSavedObjectsClient.bulkUpdate(
      [
        {
          id: currentTemplate.id,
          type: CASE_TEMPLATE_SAVED_OBJECT,
          attributes: {
            isLatest: false,
          },
        },
      ],
      { refresh: true }
    );

    await this.updateMappings(input.definition);

    return templateSavedObject;
  }

  async deleteTemplate(templateId: string): Promise<void> {
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
