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

export class TemplatesService {
  constructor(
    private readonly dependencies: {
      unsecuredSavedObjectsClient: SavedObjectsClientContract;
      savedObjectsSerializer: ISavedObjectsSerializer;
      esClient: ElasticsearchClient;
      internalClusterClient: ElasticsearchClient;
    }
  ) {}

  async getAllTemplates(
    filterById?: string,
    version?: string
  ): Promise<Array<SavedObject<Template>>> {
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

    const latestTemplateVersions = findResult.aggregations.by_template.buckets.flatMap(
      (bucket) =>
        bucket.latest_template.hits?.hits?.map((hit) =>
          this.dependencies.savedObjectsSerializer.rawToSavedObject<Template>(hit)
        ) ?? []
    );

    return latestTemplateVersions;
  }

  async getTemplate(
    templateId: string,
    version?: string
  ): Promise<SavedObject<Template> | undefined> {
    return (await this.getAllTemplates(templateId, version))[0];
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
