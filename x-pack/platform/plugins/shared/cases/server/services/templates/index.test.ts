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

const buildDefinition = (name: string, extras?: { description?: string; tags?: string[] }) =>
  yaml.dump({
    name,
    ...(extras?.description ? { description: extras.description } : {}),
    ...(extras?.tags ? { tags: extras.tags } : {}),
    fields: [
      {
        control: 'INPUT_TEXT',
        name: 'field_one',
        type: 'keyword',
      },
    ],
  });

/**
 * Creates a mock ES search response with hits from an array of saved objects.
 */
const createMockSearchResponse = (
  savedObjects: Array<SavedObject<Template>>,
  totalOverride?: number
) =>
  ({
    took: 1,
    timed_out: false,
    _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: {
      total: { value: totalOverride ?? savedObjects.length, relation: 'eq' },
      max_score: null,
      hits: savedObjects.map((so) => ({ _id: so.id, _index: '.kibana_cases' })),
    },
  } as unknown as SavedObjectsSearchResponse<SavedObjectsRawDocSource, unknown>);

/**
 * Creates a mock Template saved object.
 */
const createTemplateSO = (
  id: string,
  attrs: Partial<Template> & Pick<Template, 'name' | 'templateId'>
): SavedObject<Template> =>
  ({
    id,
    attributes: {
      templateVersion: 1,
      deletedAt: null,
      owner: 'securitySolution',
      definition: '',
      author: 'unknown',
      ...attrs,
    } as Template,
  } as SavedObject<Template>);

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

  /** Default getAllTemplates params — override individual fields as needed */
  const defaultFindParams = {
    page: 1,
    perPage: 10,
    isDeleted: false,
    tags: [] as string[],
    author: [] as string[],
    sortField: 'name' as const,
    sortOrder: 'asc' as const,
    search: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTemplates', () => {
    it('returns templates parsed from search hits', async () => {
      const service = createService();
      const so1 = createTemplateSO('so-1', { templateId: 't-1', name: 'Template A' });
      const so2 = createTemplateSO('so-2', { templateId: 't-2', name: 'Template B' });

      unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([so1, so2]));
      savedObjectsSerializer.rawToSavedObject.mockReturnValueOnce(so1).mockReturnValueOnce(so2);

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
        templates: [
          { ...so1.attributes, fieldSearchMatches: false },
          { ...so2.attributes, fieldSearchMatches: false },
        ],
        page: 1,
        perPage: 10,
        total: 2,
      });
    });

    it('returns an empty list when no templates exist', async () => {
      const service = createService();
      unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([]));

      const result = await service.getAllTemplates({ ...defaultFindParams });

      expect(result).toEqual({ templates: [], page: 1, perPage: 10, total: 0 });
    });

    describe('sorting', () => {
      it('passes sort by name ascending to ES by default', async () => {
        const service = createService();
        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([]));

        await service.getAllTemplates({ ...defaultFindParams });

        expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: expect.arrayContaining([
              {
                [`${CASE_TEMPLATE_SAVED_OBJECT}.name`]: {
                  order: 'asc',
                  missing: '_last',
                },
              },
            ]),
          })
        );
      });

      it('passes sort by name descending to ES', async () => {
        const service = createService();
        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([]));

        await service.getAllTemplates({
          ...defaultFindParams,
          sortField: 'name',
          sortOrder: 'desc',
        });

        expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: expect.arrayContaining([
              {
                [`${CASE_TEMPLATE_SAVED_OBJECT}.name`]: {
                  order: 'desc',
                  missing: '_last',
                },
              },
            ]),
          })
        );
      });

      it('passes sort by templateVersion to ES', async () => {
        const service = createService();
        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([]));

        await service.getAllTemplates({
          ...defaultFindParams,
          sortField: 'templateVersion',
          sortOrder: 'asc',
        });

        expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: expect.arrayContaining([
              {
                [`${CASE_TEMPLATE_SAVED_OBJECT}.templateVersion`]: {
                  order: 'asc',
                  missing: '_last',
                },
              },
            ]),
          })
        );
      });

      it('returns templates in the order ES provides', async () => {
        const service = createService();
        const soAlpha = createTemplateSO('so-a', { templateId: 't-a', name: 'Alpha' });
        const soBeta = createTemplateSO('so-b', { templateId: 't-b', name: 'Beta' });
        const soGamma = createTemplateSO('so-g', { templateId: 't-g', name: 'Gamma' });

        unsecuredSavedObjectsClient.search.mockResolvedValue(
          createMockSearchResponse([soAlpha, soBeta, soGamma])
        );
        savedObjectsSerializer.rawToSavedObject
          .mockReturnValueOnce(soAlpha)
          .mockReturnValueOnce(soBeta)
          .mockReturnValueOnce(soGamma);

        const result = await service.getAllTemplates({ ...defaultFindParams });

        expect(result.templates.map((t) => t.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
      });
    });

    describe('pagination', () => {
      it('passes from and size to ES for page 1', async () => {
        const service = createService();
        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([]));

        await service.getAllTemplates({
          ...defaultFindParams,
          page: 1,
          perPage: 10,
        });

        expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            from: 0,
            size: 10,
          })
        );
      });

      it('passes correct from for page 2', async () => {
        const service = createService();
        const soC = createTemplateSO('so-2', { templateId: 't-2', name: 'Template C' });
        const soD = createTemplateSO('so-3', { templateId: 't-3', name: 'Template D' });

        unsecuredSavedObjectsClient.search.mockResolvedValue(
          createMockSearchResponse([soC, soD], 5)
        );
        savedObjectsSerializer.rawToSavedObject.mockReturnValueOnce(soC).mockReturnValueOnce(soD);

        const result = await service.getAllTemplates({
          ...defaultFindParams,
          page: 2,
          perPage: 2,
        });

        expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            from: 2,
            size: 2,
          })
        );
        expect(result.total).toBe(5);
        expect(result.page).toBe(2);
        expect(result.perPage).toBe(2);
        expect(result.templates).toHaveLength(2);
        expect(result.templates.map((t) => t.name)).toEqual(['Template C', 'Template D']);
      });

      it('returns the last partial page correctly', async () => {
        const service = createService();
        const soE = createTemplateSO('so-4', { templateId: 't-4', name: 'Template E' });

        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([soE], 5));
        savedObjectsSerializer.rawToSavedObject.mockReturnValueOnce(soE);

        const result = await service.getAllTemplates({
          ...defaultFindParams,
          page: 3,
          perPage: 2,
        });

        expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            from: 4,
            size: 2,
          })
        );
        expect(result.templates).toHaveLength(1);
        expect(result.templates[0].name).toBe('Template E');
      });

      it('returns empty templates for a page beyond total', async () => {
        const service = createService();

        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([], 5));

        const result = await service.getAllTemplates({
          ...defaultFindParams,
          page: 10,
          perPage: 2,
        });

        expect(unsecuredSavedObjectsClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            from: 18,
            size: 2,
          })
        );
        expect(result.templates).toHaveLength(0);
        expect(result.total).toBe(5);
      });
    });

    describe('ES query construction', () => {
      it('passes search term as wildcard + match_phrase in must clause', async () => {
        const service = createService();
        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([]));

        await service.getAllTemplates({
          ...defaultFindParams,
          search: 'my-search',
        });

        const searchCall = unsecuredSavedObjectsClient.search.mock.calls[0][0];
        const query = searchCall?.query as { bool: { must?: unknown[] } };
        expect(query.bool.must).toBeDefined();
        expect(query.bool.must).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              bool: expect.objectContaining({
                should: expect.arrayContaining([
                  expect.objectContaining({
                    wildcard: expect.objectContaining({
                      [`${CASE_TEMPLATE_SAVED_OBJECT}.name`]: expect.objectContaining({
                        value: '*my-search*',
                        case_insensitive: true,
                      }),
                    }),
                  }),
                  expect.objectContaining({
                    match_phrase: expect.objectContaining({
                      [`${CASE_TEMPLATE_SAVED_OBJECT}.description`]: 'my-search',
                    }),
                  }),
                  expect.objectContaining({
                    wildcard: expect.objectContaining({
                      [`${CASE_TEMPLATE_SAVED_OBJECT}.fieldNames`]: expect.objectContaining({
                        value: '*my-search*',
                        case_insensitive: true,
                      }),
                    }),
                  }),
                ]),
                minimum_should_match: 1,
              }),
            }),
          ])
        );
      });

      it('does not include must clause when search is empty', async () => {
        const service = createService();
        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([]));

        await service.getAllTemplates({ ...defaultFindParams });

        const searchCall = unsecuredSavedObjectsClient.search.mock.calls[0][0];
        const query = searchCall?.query as { bool: { must?: unknown[] } };
        expect(query.bool.must).toBeUndefined();
      });

      it('passes tags as KQL filter when provided', async () => {
        const service = createService();
        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([]));

        await service.getAllTemplates({
          ...defaultFindParams,
          tags: ['security', 'network'],
        });

        expect(unsecuredSavedObjectsClient.search).toHaveBeenCalled();
        const searchCall = unsecuredSavedObjectsClient.search.mock.calls[0][0];
        const query = searchCall?.query as { bool: { filter?: unknown[] } };
        // Should have at least 2 filters: deletedAt + tags
        expect(query.bool.filter!.length).toBeGreaterThanOrEqual(2);
      });

      it('passes author as KQL filter when provided', async () => {
        const service = createService();
        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([]));

        await service.getAllTemplates({
          ...defaultFindParams,
          author: ['alice', 'bob'],
        });

        expect(unsecuredSavedObjectsClient.search).toHaveBeenCalled();
        const searchCall = unsecuredSavedObjectsClient.search.mock.calls[0][0];
        const query = searchCall?.query as { bool: { filter?: unknown[] } };
        // Should have at least 2 filters: deletedAt + author
        expect(query.bool.filter!.length).toBeGreaterThanOrEqual(2);
      });

      it('omits deletedAt filter when isDeleted is true', async () => {
        const service = createService();
        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([]));

        await service.getAllTemplates({
          ...defaultFindParams,
          isDeleted: true,
        });

        const searchCall = unsecuredSavedObjectsClient.search.mock.calls[0][0];
        const query = searchCall?.query as { bool: { filter?: unknown[] } };
        // Only the isLatest filter remains (deletedAt is omitted when isDeleted is true)
        expect(query.bool.filter).toHaveLength(1);
        expect(query.bool.filter).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              bool: expect.objectContaining({
                should: expect.arrayContaining([
                  expect.objectContaining({
                    match: expect.objectContaining({
                      [`${CASE_TEMPLATE_SAVED_OBJECT}.isLatest`]: true,
                    }),
                  }),
                ]),
              }),
            }),
          ])
        );
      });
    });

    describe('fieldSearchMatches enrichment', () => {
      it('sets fieldSearchMatches to true when search matches a fieldName', async () => {
        const service = createService();
        const soMatch = createTemplateSO('so-match', {
          templateId: 't-match',
          name: 'Matching Template',
          fieldNames: ['severity', 'hostname'],
        });
        const soNoMatch = createTemplateSO('so-nomatch', {
          templateId: 't-nomatch',
          name: 'No Match Template',
          fieldNames: ['effort', 'details'],
        });

        unsecuredSavedObjectsClient.search.mockResolvedValue(
          createMockSearchResponse([soMatch, soNoMatch])
        );
        savedObjectsSerializer.rawToSavedObject
          .mockReturnValueOnce(soMatch)
          .mockReturnValueOnce(soNoMatch);

        const result = await service.getAllTemplates({
          ...defaultFindParams,
          search: 'host',
        });

        // Sorted by name: "Matching Template" (index 0), "No Match Template" (index 1)
        expect(result.templates[0].fieldSearchMatches).toBe(true);
        expect(result.templates[1].fieldSearchMatches).toBe(false);
      });

      it('is case-insensitive when matching fieldNames', async () => {
        const service = createService();
        const so = createTemplateSO('so-1', {
          templateId: 't-1',
          name: 'Template',
          fieldNames: ['HostName', 'Severity'],
        });

        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([so]));
        savedObjectsSerializer.rawToSavedObject.mockReturnValueOnce(so);

        const result = await service.getAllTemplates({
          ...defaultFindParams,
          search: 'hostname',
        });

        expect(result.templates[0].fieldSearchMatches).toBe(true);
      });

      it('sets fieldSearchMatches to false for all templates when search is empty', async () => {
        const service = createService();
        const so = createTemplateSO('so-1', {
          templateId: 't-1',
          name: 'Template',
          fieldNames: ['severity', 'hostname'],
        });

        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([so]));
        savedObjectsSerializer.rawToSavedObject.mockReturnValueOnce(so);

        const result = await service.getAllTemplates({ ...defaultFindParams });

        expect(result.templates[0].fieldSearchMatches).toBe(false);
      });

      it('sets fieldSearchMatches to false when fieldNames is undefined', async () => {
        const service = createService();
        const so = createTemplateSO('so-1', {
          templateId: 't-1',
          name: 'Template',
          // no fieldNames set
        });

        unsecuredSavedObjectsClient.search.mockResolvedValue(createMockSearchResponse([so]));
        savedObjectsSerializer.rawToSavedObject.mockReturnValueOnce(so);

        const result = await service.getAllTemplates({
          ...defaultFindParams,
          search: 'anything',
        });

        expect(result.templates[0].fieldSearchMatches).toBe(false);
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

    await service.createTemplate(
      {
        owner: 'securitySolution',
        definition,
      },
      'test-user'
    );

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

    await service.createTemplate(
      {
        owner: 'securitySolution',
        definition,
        description: 'A detailed description',
        tags: ['security', 'network'],
      },
      'alice'
    );

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

  it('extracts description and tags from YAML on create, preferring YAML over input', async () => {
    const definition = buildDefinition('YAML Template', {
      description: 'Description from YAML',
      tags: ['yaml-tag-1', 'yaml-tag-2'],
    });
    const service = createService();

    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: 'template-id',
      attributes: {} as Template,
    } as SavedObject<Template>);

    await service.createTemplate(
      {
        owner: 'securitySolution',
        definition,
        description: 'Description from input',
        tags: ['input-tag'],
      },
      'alice'
    );

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CASE_TEMPLATE_SAVED_OBJECT,
      expect.objectContaining({
        name: 'YAML Template',
        description: 'Description from YAML',
        tags: ['yaml-tag-1', 'yaml-tag-2'],
      }),
      expect.any(Object)
    );
  });

  it('falls back to input description and tags when not present in YAML on create', async () => {
    const definition = buildDefinition('Plain Template');
    const service = createService();

    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: 'template-id',
      attributes: {} as Template,
    } as SavedObject<Template>);

    await service.createTemplate(
      {
        owner: 'securitySolution',
        definition,
        description: 'Fallback description',
        tags: ['fallback-tag'],
      },
      'alice'
    );

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CASE_TEMPLATE_SAVED_OBJECT,
      expect.objectContaining({
        name: 'Plain Template',
        description: 'Fallback description',
        tags: ['fallback-tag'],
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
        author: 'test-user',
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
        author: 'bob',
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

  it('extracts description and tags from YAML on update, preferring YAML over input', async () => {
    const definition = buildDefinition('YAML Updated', {
      description: 'YAML description',
      tags: ['yaml-tag'],
    });
    const service = createService();

    jest.spyOn(service, 'getTemplate').mockResolvedValue({
      id: 'template-so-id',
      attributes: {
        templateId: 'template-id',
        name: 'Previous',
        owner: 'securitySolution',
        definition: buildDefinition('Previous'),
        templateVersion: 1,
        deletedAt: null,
        author: 'alice',
      },
    } as SavedObject<Template>);

    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: 'template-new-so-id',
      attributes: {} as Template,
    } as SavedObject<Template>);

    await service.updateTemplate('template-id', {
      owner: 'observability',
      definition,
      description: 'Input description (should be overridden)',
      tags: ['input-tag'],
    });

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CASE_TEMPLATE_SAVED_OBJECT,
      expect.objectContaining({
        description: 'YAML description',
        tags: ['yaml-tag'],
      }),
      expect.any(Object)
    );
  });

  it('falls back to input description and tags when not present in YAML on update', async () => {
    const definition = buildDefinition('Plain Updated');
    const service = createService();

    jest.spyOn(service, 'getTemplate').mockResolvedValue({
      id: 'template-so-id',
      attributes: {
        templateId: 'template-id',
        name: 'Previous',
        owner: 'securitySolution',
        definition: buildDefinition('Previous'),
        templateVersion: 1,
        deletedAt: null,
        author: 'alice',
      },
    } as SavedObject<Template>);

    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: 'template-new-so-id',
      attributes: {} as Template,
    } as SavedObject<Template>);

    await service.updateTemplate('template-id', {
      owner: 'observability',
      definition,
      description: 'Fallback description',
      tags: ['fallback-tag'],
    });

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CASE_TEMPLATE_SAVED_OBJECT,
      expect.objectContaining({
        description: 'Fallback description',
        tags: ['fallback-tag'],
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
