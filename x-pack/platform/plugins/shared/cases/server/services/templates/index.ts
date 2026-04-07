/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  ElasticsearchClient,
  ISavedObjectsSerializer,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsRawDoc,
} from '@kbn/core/server';
import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import { v4 } from 'uuid';
import { load as parseYaml } from 'js-yaml';
import type {
  CreateTemplateInput,
  ParsedTemplate,
  Template,
  UpdateTemplateInput,
} from '../../../common/types/domain/template/v1';
import { CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
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
      namespace: string;
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
      owner,
      isDeleted,
      isEnabled,
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
      owner,
      isLatest: true,
      isEnabled,
    });

    const searchLower = search?.toLowerCase() ?? '';

    return {
      templates: templates.map((so) => ({
        ...so.attributes,
        fieldSearchMatches:
          searchLower !== '' &&
          (so.attributes.fieldNames ?? []).some((fieldName) =>
            fieldName.toLowerCase().includes(searchLower)
          ),
      })),
      page,
      perPage,
      total,
    };
  }

  async getTemplate(
    templateId: string,
    version?: string
  ): Promise<SavedObject<Template> | undefined> {
    return this._getTemplate(templateId, version);
  }

  private async _getTemplate(
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
    owner,
    isEnabled,
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
    owner?: string[];
    isEnabled?: boolean;
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
      ...(isEnabled !== undefined
        ? [toElasticsearchQuery(fromKueryExpression(`${SO}.isEnabled: ${isEnabled}`))]
        : []),
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
      ...(owner && owner.length > 0
        ? [
            toElasticsearchQuery(
              fromKueryExpression(owner.map((o) => `${SO}.owner: "${o}"`).join(' OR '))
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
      type: CASE_TEMPLATE_SAVED_OBJECT,
      namespaces: [this.dependencies.namespace],
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

  async createTemplate(
    input: CreateTemplateInput,
    author: string,
    id: string = v4()
  ): Promise<SavedObject<Template>> {
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
        description: parsedDefinition.description ?? input.description,
        tags: parsedDefinition.tags ?? input.tags,
        author,
        fieldCount: parsedDefinition.fields.length,
        fieldNames: parsedDefinition.fields.map((f) => f.name),
        isEnabled: input.isEnabled ?? true,
      } as Template,
      { refresh: true, id }
    );

    return templateSavedObject;
  }

  async updateTemplate(
    templateId: string,
    input: UpdateTemplateInput
  ): Promise<SavedObject<Template>> {
    const currentTemplate = await this._getTemplate(templateId);

    if (!currentTemplate) {
      throw Boom.notFound(`Template with id ${templateId} not found`);
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
        description: parsedDefinition.description ?? input.description,
        tags: parsedDefinition.tags ?? input.tags,
        author: currentTemplate.attributes.author,
        fieldCount: parsedDefinition.fields.length,
        fieldNames: parsedDefinition.fields.map((f) => f.name),
        usageCount: currentTemplate.attributes.usageCount,
        lastUsedAt: currentTemplate.attributes.lastUsedAt,
        isEnabled: input.isEnabled ?? currentTemplate.attributes.isEnabled ?? true,
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

    return templateSavedObject;
  }

  /**
   * Returns all unique tags from the latest version of each non-deleted template.
   */
  async getTags(): Promise<string[]> {
    const { templates } = await this.searchTemplates({
      page: 1,
      perPage: 10000,
      sortField: 'name',
      sortOrder: 'asc',
      isLatest: true,
    });
    const tags = templates.flatMap((so) => so.attributes.tags ?? []).filter(Boolean);
    return [...new Set(tags)].sort();
  }

  /**
   * Returns all unique authors from the latest version of each non-deleted template.
   */
  async getAuthors(): Promise<string[]> {
    const { templates } = await this.searchTemplates({
      page: 1,
      perPage: 10000,
      sortField: 'name',
      sortOrder: 'asc',
      isLatest: true,
    });
    const authors = templates
      .map((so) => so.attributes.author)
      .filter((a): a is string => Boolean(a));
    return [...new Set(authors)].sort();
  }

  async incrementUsageStats(templateId: string): Promise<void> {
    const template = await this._getTemplate(templateId);

    if (!template) {
      return;
    }

    await this.dependencies.unsecuredSavedObjectsClient.bulkUpdate(
      [
        {
          id: template.id,
          type: CASE_TEMPLATE_SAVED_OBJECT,
          attributes: {
            usageCount: (template.attributes.usageCount ?? 0) + 1,
            lastUsedAt: new Date().toISOString(),
          },
        },
      ],
      { refresh: false }
    );
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const latestTemplate = await this._getTemplate(templateId);

    if (!latestTemplate) {
      return;
    }

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
