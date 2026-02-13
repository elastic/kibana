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

    const allLatest = await this.fetchLatestTemplates({ isDeleted, search, tags, author });

    // Sort (must be done in memory — aggregation buckets can't be sorted by arbitrary fields)
    const sorted = [...allLatest].sort((a, b) => {
      const aVal = a.attributes[sortField];
      const bVal = b.attributes[sortField];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
        comparison = Number(aVal) - Number(bVal);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginate
    const total = sorted.length;
    const start = (page - 1) * perPage;
    const paginated = sorted.slice(start, start + perPage);

    return {
      templates: paginated.map((so) => so.attributes),
      page,
      perPage,
      total,
    };
  }

  async getTemplate(
    templateId: string,
    version?: string
  ): Promise<SavedObject<Template> | undefined> {
    const allLatest = await this.fetchLatestTemplates({ templateId, version });
    return allLatest[0];
  }

  /**
   * Fetches the latest version of each template from ES using aggregations.
   * Filtering (search, tags, author) is pushed into the ES query so fewer
   * documents enter the aggregation buckets.
   */
  private async fetchLatestTemplates({
    isDeleted = false,
    templateId,
    version,
    search,
    tags,
    author,
  }: {
    isDeleted?: boolean;
    templateId?: string;
    version?: string;
    search?: string;
    tags?: string[];
    author?: string[];
  } = {}): Promise<Array<SavedObject<Template>>> {
    interface SearchResult {
      aggregations: {
        by_template: {
          buckets: Array<{
            latest_template: {
              hits: {
                hits: SavedObjectsRawDoc[];
              };
            };
          }>;
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

    const findResult = (await this.dependencies.unsecuredSavedObjectsClient.search({
      namespaces: ['*'],
      type: CASE_TEMPLATE_SAVED_OBJECT,
      query: {
        bool: {
          filter: filters,
          ...(must.length > 0 ? { must } : {}),
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
                    [`${CASE_TEMPLATE_SAVED_OBJECT}.templateVersion`]: {
                      order: 'desc',
                    },
                  },
                ],
              },
            },
          },
        },
      },
    })) as SearchResult;

    return findResult.aggregations.by_template.buckets.flatMap(
      (bucket) =>
        bucket.latest_template.hits?.hits?.map((hit) =>
          this.dependencies.savedObjectsSerializer.rawToSavedObject<Template>(hit)
        ) ?? []
    );
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
