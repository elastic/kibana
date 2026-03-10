/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { PersistedSkillCreateRequest } from '@kbn/agent-builder-common';
import { createClient, type SkillClient } from './client';

const mockBulk = jest.fn();
const mockIndex = jest.fn();
const mockSearch = jest.fn();
const mockDelete = jest.fn();

jest.mock('./storage', () => ({
  createStorage: () => ({
    getClient: () => ({
      bulk: mockBulk,
      index: mockIndex,
      search: mockSearch,
      delete: mockDelete,
    }),
  }),
  skillIndexName: '.kibana-agent-builder-skills',
}));

describe('SkillClient', () => {
  let client: SkillClient;

  beforeEach(() => {
    jest.clearAllMocks();

    client = createClient({
      space: 'default',
      logger: loggerMock.create(),
      esClient: {} as any,
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
      mockBulk.mockResolvedValue({ errors: false, items: [], took: 1 });

      const requests = [createRequest('skill-a'), createRequest('skill-b')];
      const results = await client.bulkCreate(requests);

      expect(mockBulk).toHaveBeenCalledTimes(1);
      const bulkCall = mockBulk.mock.calls[0][0];
      expect(bulkCall.throwOnFail).toBe(true);
      expect(bulkCall.operations).toHaveLength(2);

      expect(bulkCall.operations[0]).toEqual({
        index: {
          document: expect.objectContaining({ id: 'skill-a', space: 'default' }),
        },
      });
      expect(bulkCall.operations[1]).toEqual({
        index: {
          document: expect.objectContaining({ id: 'skill-b', space: 'default' }),
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
      expect(mockBulk).not.toHaveBeenCalled();
    });

    it('uses the same creation timestamp for all skills', async () => {
      mockBulk.mockResolvedValue({ errors: false, items: [], took: 1 });

      const requests = [createRequest('skill-a'), createRequest('skill-b')];
      const results = await client.bulkCreate(requests);

      expect(results[0].created_at).toBe(results[1].created_at);
      expect(results[0].updated_at).toBe(results[1].updated_at);
      expect(results[0].created_at).toBe(results[0].updated_at);
    });

    it('propagates bulk operation errors', async () => {
      mockBulk.mockRejectedValue(new Error('Bulk operation failed'));

      await expect(client.bulkCreate([createRequest('skill-a')])).rejects.toThrow(
        'Bulk operation failed'
      );
    });
  });
});
