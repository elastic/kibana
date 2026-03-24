/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  isSkillNotFoundError,
  isBadRequestError,
  type PersistedSkillCreateRequest,
} from '@kbn/agent-builder-common';
import { createClient, type SkillClient } from './client';

const testSpace = 'default';
const creationDate = '2024-09-04T06:44:17.944Z';
const updateDate = '2025-08-04T06:44:19.123Z';

const createMockSkillDoc = (
  overrides: {
    id?: string;
    name?: string;
    description?: string;
    content?: string;
    toolIds?: string[];
  } = {}
) => ({
  _id: `doc-${overrides.id ?? 'my-skill'}`,
  _source: {
    id: overrides.id ?? 'my-skill',
    name: overrides.name ?? 'My Skill',
    space: testSpace,
    description: overrides.description ?? 'A skill description',
    content: overrides.content ?? 'Skill content body',
    tool_ids: overrides.toolIds ?? [],
    created_at: creationDate,
    updated_at: updateDate,
  },
});

interface MockEsClient {
  search: jest.Mock;
  index: jest.Mock;
  delete: jest.Mock;
  bulk: jest.Mock;
}

const mockEsClient: MockEsClient = {
  search: jest.fn(),
  index: jest.fn(),
  delete: jest.fn(),
  bulk: jest.fn(),
};

jest.mock('./storage', () => ({
  createStorage: jest.fn(() => ({
    getClient: jest.fn(() => mockEsClient),
  })),
}));

describe('SkillClient', () => {
  let client: SkillClient;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    jest.clearAllMocks();

    client = createClient({
      space: testSpace,
      logger,
      esClient: {} as never,
    });
  });

  describe('has', () => {
    it('returns true when the skill exists', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockSkillDoc()] },
      });

      const result = await client.has('my-skill');

      expect(result).toBe(true);
    });

    it('returns false when the skill does not exist', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      const result = await client.has('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('returns the skill when it exists', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockSkillDoc()] },
      });

      const result = await client.get('my-skill');

      expect(result).toEqual({
        id: 'my-skill',
        name: 'My Skill',
        description: 'A skill description',
        content: 'Skill content body',
        referenced_content: [],
        tool_ids: [],
        referenced_content_count: 0,
        created_at: creationDate,
        updated_at: updateDate,
      });
    });

    it('throws a skill-not-found error when the skill does not exist', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      const error = await client.get('non-existent').catch((e) => e);

      expect(isSkillNotFoundError(error)).toBe(true);
    });

    it('filters by space and skill id in query', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      await client.get('test-skill').catch(() => {});

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 1,
          terminate_after: 1,
          query: {
            bool: {
              filter: expect.arrayContaining([{ term: { id: 'test-skill' } }]),
            },
          },
        })
      );
    });
  });

  describe('list', () => {
    it('returns all skills for the space', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          total: { value: 2 },
          hits: [
            createMockSkillDoc({ id: 'skill-1', name: 'Skill One' }),
            createMockSkillDoc({ id: 'skill-2', name: 'Skill Two' }),
          ],
        },
      });

      const result = await client.list();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('skill-1');
      expect(result[1].id).toBe('skill-2');
    });

    it('returns empty array when no skills exist', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
      });

      const result = await client.list();

      expect(result).toEqual([]);
    });

    it('logs a warning when total exceeds limit', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          total: { value: 1500 },
          hits: Array.from({ length: 1000 }, (_, i) => createMockSkillDoc({ id: `skill-${i}` })),
        },
      });

      await client.list();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('exceeds the limit of 1000')
      );
    });

    it('requests track_total_hits', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
      });

      await client.list();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          track_total_hits: true,
          size: 1000,
        })
      );
    });
  });

  describe('list with summaryOnly', () => {
    const createMockSummaryDoc = (id: string, refCount: number) => ({
      _id: `doc-${id}`,
      _source: {
        id,
        name: `Skill ${id}`,
        space: testSpace,
        description: `Description for ${id}`,
        tool_ids: ['tool-a'],
        created_at: creationDate,
        updated_at: updateDate,
      },
      fields: {
        referenced_content_count: [refCount],
      },
    });

    it('returns skills with empty content and referenced_content_count populated', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          total: { value: 2 },
          hits: [createMockSummaryDoc('skill-1', 3), createMockSummaryDoc('skill-2', 0)],
        },
      });

      const result = await client.list({ summaryOnly: true });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'skill-1',
          name: 'Skill skill-1',
          description: 'Description for skill-1',
          tool_ids: ['tool-a'],
          referenced_content_count: 3,
          content: '',
          referenced_content: [],
        })
      );
      expect(result[1].referenced_content_count).toBe(0);
    });

    it('uses _source exclusion and runtime_mappings in the search request', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
      });

      await client.list({ summaryOnly: true });

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          _source: { excludes: ['content', 'referenced_content'] },
          runtime_mappings: expect.objectContaining({
            referenced_content_count: expect.objectContaining({
              type: 'long',
            }),
          }),
          fields: ['referenced_content_count'],
          track_total_hits: true,
          size: 1000,
        })
      );
    });

    it('does not use _source exclusion when summaryOnly is not set', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
      });

      await client.list();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.not.objectContaining({
          _source: expect.anything(),
        })
      );
    });

    it('falls back to referenced_content array length when fields are missing', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [
            {
              _id: 'doc-skill-1',
              _source: {
                id: 'skill-1',
                name: 'Skill 1',
                space: testSpace,
                description: 'desc',
                tool_ids: [],
                created_at: creationDate,
                updated_at: updateDate,
              },
            },
          ],
        },
      });

      const result = await client.list({ summaryOnly: true });

      expect(result[0].referenced_content_count).toBe(0);
    });
  });

  describe('create', () => {
    it('creates a new skill and returns it', async () => {
      mockEsClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } }) // _get check: not exists
        .mockResolvedValueOnce({
          hits: { hits: [createMockSkillDoc({ id: 'new-skill', name: 'New Skill' })] },
        }); // get after create
      mockEsClient.index.mockResolvedValue({});

      const result = await client.create({
        id: 'new-skill',
        name: 'New Skill',
        description: 'A new skill',
        content: 'Content',
        tool_ids: [],
      });

      expect(result.id).toBe('new-skill');
      expect(mockEsClient.index).toHaveBeenCalled();
    });

    it('throws a bad-request error when the skill already exists', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockSkillDoc()] },
      });

      const error = await client
        .create({
          id: 'my-skill',
          name: 'My Skill',
          description: 'desc',
          content: 'content',
          tool_ids: [],
        })
        .catch((e) => e);

      expect(isBadRequestError(error)).toBe(true);
      expect(error.message).toContain('already exists');
    });
  });

  describe('bulkCreate', () => {
    const createRequest = (id: string): PersistedSkillCreateRequest => ({
      id,
      name: `Skill ${id}`,
      description: `Description for ${id}`,
      content: `Content for ${id}`,
      referenced_content: [],
      tool_ids: [],
      plugin_id: 'my-plugin',
    });

    it('indexes all skills in a single bulk request', async () => {
      mockEsClient.bulk.mockResolvedValue({ errors: false, items: [], took: 1 });

      const requests = [createRequest('skill-a'), createRequest('skill-b')];
      const results = await client.bulkCreate(requests);

      expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
      const bulkCall = mockEsClient.bulk.mock.calls[0][0];
      expect(bulkCall.throwOnFail).toBe(true);
      expect(bulkCall.operations).toHaveLength(2);

      expect(bulkCall.operations[0]).toEqual({
        index: {
          document: expect.objectContaining({ id: 'skill-a', space: testSpace }),
        },
      });
      expect(bulkCall.operations[1]).toEqual({
        index: {
          document: expect.objectContaining({ id: 'skill-b', space: testSpace }),
        },
      });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('skill-a');
      expect(results[0].name).toBe('Skill skill-a');
      expect(results[0].plugin_id).toBe('my-plugin');
      expect(results[1].id).toBe('skill-b');
    });

    it('returns empty array for empty input', async () => {
      const results = await client.bulkCreate([]);

      expect(results).toEqual([]);
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('uses the same creation timestamp for all skills', async () => {
      mockEsClient.bulk.mockResolvedValue({ errors: false, items: [], took: 1 });

      const requests = [createRequest('skill-a'), createRequest('skill-b')];
      const results = await client.bulkCreate(requests);

      expect(results[0].created_at).toBe(results[1].created_at);
      expect(results[0].updated_at).toBe(results[1].updated_at);
      expect(results[0].created_at).toBe(results[0].updated_at);
    });

    it('propagates bulk operation errors', async () => {
      mockEsClient.bulk.mockRejectedValue(new Error('Bulk operation failed'));

      await expect(client.bulkCreate([createRequest('skill-a')])).rejects.toThrow(
        'Bulk operation failed'
      );
    });
  });

  describe('update', () => {
    it('merges the update and returns the updated skill', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockSkillDoc()] },
      });
      mockEsClient.index.mockResolvedValue({});

      const result = await client.update('my-skill', {
        description: 'Updated description',
      });

      expect(result.description).toBe('Updated description');
      expect(result.name).toBe('My Skill');
      expect(mockEsClient.index).toHaveBeenCalled();
    });

    it('throws a skill-not-found error when the skill does not exist', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      const error = await client.update('non-existent', { description: 'Updated' }).catch((e) => e);

      expect(isSkillNotFoundError(error)).toBe(true);
    });
  });

  describe('delete', () => {
    it('deletes an existing skill', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockSkillDoc()] },
      });
      mockEsClient.delete.mockResolvedValue({ result: 'deleted' });

      await expect(client.delete('my-skill')).resolves.toBeUndefined();

      expect(mockEsClient.delete).toHaveBeenCalledWith({
        id: 'doc-my-skill',
      });
    });

    it('throws a skill-not-found error when the skill does not exist', async () => {
      mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });

      const error = await client.delete('non-existent').catch((e) => e);

      expect(isSkillNotFoundError(error)).toBe(true);
    });

    it('throws a skill-not-found error when ES reports not_found', async () => {
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [createMockSkillDoc()] },
      });
      mockEsClient.delete.mockResolvedValue({ result: 'not_found' });

      const error = await client.delete('my-skill').catch((e) => e);

      expect(isSkillNotFoundError(error)).toBe(true);
    });
  });
});
