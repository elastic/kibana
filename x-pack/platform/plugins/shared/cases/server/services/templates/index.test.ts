/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yaml from 'js-yaml';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { serializerMock } from '@kbn/core-saved-objects-base-server-mocks';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import type {
  SavedObjectsRawDocSource,
  SavedObjectsSearchResponse,
} from '@kbn/core-saved-objects-api-server';
import type { Template } from '../../../common/types/domain/template/v1';
import { CASE_EXTENDED_FIELDS, CASE_TEMPLATE_SAVED_OBJECT } from '../../../common/constants';
import { TemplatesService } from '.';

const buildDefinition = (name: string) =>
  yaml.dump({
    name,
    fields: [
      {
        control: 'INPUT_TEXT',
        name: 'field_one',
        type: 'keyword',
      },
    ],
  });

describe('TemplatesService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const savedObjectsSerializer = serializerMock.create();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const internalClusterClient = elasticsearchServiceMock.createElasticsearchClient();

  const createService = () =>
    new TemplatesService({
      unsecuredSavedObjectsClient,
      savedObjectsSerializer,
      esClient,
      internalClusterClient,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTemplates', () => {
    it('returns templates parsed from search hits', async () => {
      const service = createService();
      const templateAttrs1 = { name: 'Template A' } as Template;
      const templateAttrs2 = { name: 'Template B' } as Template;
      const rawDocs = [
        { _id: 'template-1', _index: '.kibana_cases' },
        { _id: 'template-2', _index: '.kibana_cases' },
      ];
      const savedObjects = [
        { id: 'template-1', attributes: templateAttrs1 } as SavedObject<Template>,
        { id: 'template-2', attributes: templateAttrs2 } as SavedObject<Template>,
      ];

      const searchResponse = {
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 2, relation: 'eq' },
          max_score: null,
          hits: [rawDocs[0], rawDocs[1]],
        },
      } as unknown as SavedObjectsSearchResponse<SavedObjectsRawDocSource, unknown>;

      unsecuredSavedObjectsClient.search.mockResolvedValue(searchResponse);

      savedObjectsSerializer.rawToSavedObject
        .mockReturnValueOnce(savedObjects[0])
        .mockReturnValueOnce(savedObjects[1]);

      const result = await service.getAllTemplates({
        page: 1,
        perPage: 10,
        isDeleted: false,
        tags: [],
        author: [],
        sortField: 'templateId',
        sortOrder: 'asc',
        search: '',
      });

      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 0,
          size: 10,
          sort: [
            {
              [`${CASE_TEMPLATE_SAVED_OBJECT}.templateId`]: {
                order: 'asc',
                missing: '_last',
              },
            },
          ],
        })
      );
      expect(savedObjectsSerializer.rawToSavedObject).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        templates: [templateAttrs1, templateAttrs2],
        page: 1,
        perPage: 10,
        total: 2,
      });
    });
  });

  describe('getTemplate', () => {
    it('returns the first saved object from ES search hits', async () => {
      const service = createService();
      const template = {
        id: 'template-1',
        attributes: { templateId: 'template-1', name: 'Template One' } as Template,
      } as SavedObject<Template>;

      const searchResponse = {
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: null,
          hits: [{ _id: 'template-1', _index: '.kibana_cases' }],
        },
      } as unknown as SavedObjectsSearchResponse<SavedObjectsRawDocSource, unknown>;

      unsecuredSavedObjectsClient.search.mockResolvedValue(searchResponse);
      savedObjectsSerializer.rawToSavedObject.mockReturnValueOnce(template);

      const result = await service.getTemplate('template-1');

      expect(unsecuredSavedObjectsClient.search).toHaveBeenCalled();
      expect(result).toEqual(template);
    });

    it('returns undefined when no templates are found', async () => {
      const service = createService();

      const searchResponse = {
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
      } as unknown as SavedObjectsSearchResponse<SavedObjectsRawDocSource, unknown>;

      unsecuredSavedObjectsClient.search.mockResolvedValue(searchResponse);

      const result = await service.getTemplate('missing-template');

      expect(result).toBeUndefined();
    });
  });

  it('uses the internal client to update mappings on create', async () => {
    const definition = buildDefinition('New Template');
    const service = createService();

    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: 'template-id',
      attributes: {} as Template,
    } as SavedObject<Template>);

    await service.createTemplate({
      owner: 'securitySolution',
      definition,
    });

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CASE_TEMPLATE_SAVED_OBJECT,
      expect.objectContaining({
        name: 'New Template',
        owner: 'securitySolution',
        definition,
        isLatest: true,
      }),
      expect.any(Object)
    );

    expect(internalClusterClient.indices.putMapping).toHaveBeenCalledWith({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      properties: {
        cases: {
          properties: {
            [CASE_EXTENDED_FIELDS]: {
              properties: {
                field_one_as_keyword: {
                  type: 'keyword',
                },
              },
            },
          },
        },
      },
    });
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  it('persists description, tags, author, fieldCount and fieldNames on create', async () => {
    const definition = buildDefinition('Template With Metadata');
    const service = createService();

    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: 'template-id',
      attributes: {} as Template,
    } as SavedObject<Template>);

    await service.createTemplate({
      owner: 'securitySolution',
      definition,
      description: 'A detailed description',
      tags: ['security', 'network'],
      author: 'alice',
    });

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CASE_TEMPLATE_SAVED_OBJECT,
      expect.objectContaining({
        name: 'Template With Metadata',
        description: 'A detailed description',
        tags: ['security', 'network'],
        author: 'alice',
        fieldCount: 1,
        fieldNames: ['field_one'],
        isLatest: true,
      }),
      expect.any(Object)
    );
  });

  it('uses the internal client to update mappings on update', async () => {
    const definition = buildDefinition('Updated Template');
    const service = createService();

    jest.spyOn(service, 'getTemplate').mockResolvedValue({
      id: 'template-so-id',
      attributes: {
        templateId: 'template-id',
        name: 'Previous Template',
        owner: 'securitySolution',
        definition: buildDefinition('Previous Template'),
        templateVersion: 1,
        deletedAt: null,
      },
    } as SavedObject<Template>);

    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: 'template-new-so-id',
      attributes: {} as Template,
    } as SavedObject<Template>);

    await service.updateTemplate('template-id', {
      owner: 'observability',
      definition,
    });

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CASE_TEMPLATE_SAVED_OBJECT,
      expect.objectContaining({
        name: 'Updated Template',
        owner: 'observability',
        definition,
        isLatest: true,
      }),
      expect.any(Object)
    );
    expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledWith(
      [
        {
          id: 'template-so-id',
          type: CASE_TEMPLATE_SAVED_OBJECT,
          attributes: {
            isLatest: false,
          },
        },
      ],
      { refresh: true }
    );

    expect(internalClusterClient.indices.putMapping).toHaveBeenCalledWith({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      properties: {
        cases: {
          properties: {
            [CASE_EXTENDED_FIELDS]: {
              properties: {
                field_one_as_keyword: {
                  type: 'keyword',
                },
              },
            },
          },
        },
      },
    });
    expect(esClient.indices.putMapping).not.toHaveBeenCalled();
  });

  it('persists description, tags, author, fieldCount and fieldNames on update', async () => {
    const definition = buildDefinition('Updated With Metadata');
    const service = createService();

    jest.spyOn(service, 'getTemplate').mockResolvedValue({
      id: 'template-so-id',
      attributes: {
        templateId: 'template-id',
        name: 'Previous Template',
        owner: 'securitySolution',
        definition: buildDefinition('Previous Template'),
        templateVersion: 1,
        deletedAt: null,
      },
    } as SavedObject<Template>);

    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: 'template-new-so-id',
      attributes: {} as Template,
    } as SavedObject<Template>);

    await service.updateTemplate('template-id', {
      owner: 'observability',
      definition,
      description: 'Updated description',
      tags: ['updated', 'tag'],
      author: 'bob',
    });

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CASE_TEMPLATE_SAVED_OBJECT,
      expect.objectContaining({
        name: 'Updated With Metadata',
        description: 'Updated description',
        tags: ['updated', 'tag'],
        author: 'bob',
        fieldCount: 1,
        fieldNames: ['field_one'],
        isLatest: true,
      }),
      expect.any(Object)
    );
  });

  describe('updateTemplate', () => {
    it('throws when the template does not exist', async () => {
      const service = createService();
      jest.spyOn(service, 'getTemplate').mockResolvedValue(undefined);

      await expect(
        service.updateTemplate('missing-template', {
          owner: 'securitySolution',
          definition: buildDefinition('Missing Template'),
        })
      ).rejects.toThrow('template does not exist');
    });
  });

  describe('deleteTemplate', () => {
    it('marks all matching templates as deleted', async () => {
      const service = createService();
      const findResponse: SavedObjectsFindResponse = {
        page: 1,
        per_page: 10000,
        total: 2,
        saved_objects: [
          {
            id: 'so-1',
            type: CASE_TEMPLATE_SAVED_OBJECT,
            attributes: {} as Template,
            references: [],
            score: 0,
          },
          {
            id: 'so-2',
            type: CASE_TEMPLATE_SAVED_OBJECT,
            attributes: {} as Template,
            references: [],
            score: 0,
          },
        ],
      };

      unsecuredSavedObjectsClient.find.mockResolvedValue(findResponse);

      await service.deleteTemplate('template-1');

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledWith(
        [
          {
            id: 'so-1',
            type: CASE_TEMPLATE_SAVED_OBJECT,
            attributes: { deletedAt: expect.any(String) },
          },
          {
            id: 'so-2',
            type: CASE_TEMPLATE_SAVED_OBJECT,
            attributes: { deletedAt: expect.any(String) },
          },
        ],
        { refresh: true }
      );
    });
  });
});
