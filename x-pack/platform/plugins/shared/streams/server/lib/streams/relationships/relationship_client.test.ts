/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Relationship } from '@kbn/streams-schema';
import type { IStorageClient } from '@kbn/storage-adapter';
import { RelationshipClient } from './relationship_client';
import { RelationshipNotFoundError } from '../errors/relationship_not_found_error';
import type { RelationshipStorageSettings } from './storage_settings';
import type { StoredRelationship } from './stored_relationship';
import {
  FROM_STREAM,
  TO_STREAM,
  RELATIONSHIP_DESCRIPTION,
  RELATIONSHIP_DIRECTION,
  RELATIONSHIP_SOURCE,
  RELATIONSHIP_CONFIDENCE,
  RELATIONSHIP_UUID,
  RELATIONSHIP_UPDATED_AT,
} from './fields';

describe('RelationshipClient', () => {
  let mockStorageClient: jest.Mocked<
    IStorageClient<RelationshipStorageSettings, StoredRelationship>
  >;
  let relationshipClient: RelationshipClient;

  const createMockStorageClient = (): jest.Mocked<
    IStorageClient<RelationshipStorageSettings, StoredRelationship>
  > => {
    return {
      index: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
      search: jest.fn(),
      bulk: jest.fn(),
      clean: jest.fn(),
    } as unknown as jest.Mocked<IStorageClient<RelationshipStorageSettings, StoredRelationship>>;
  };

  beforeEach(() => {
    mockStorageClient = createMockStorageClient();
    relationshipClient = new RelationshipClient({
      storageClient: mockStorageClient,
    });
  });

  describe('linkRelationship', () => {
    it('should create a relationship with proper storage format', async () => {
      const relationship: Relationship = {
        from_stream: 'stream-a',
        to_stream: 'stream-b',
        description: 'Test relationship',
        direction: 'bidirectional',
        source: 'manual',
      };

      mockStorageClient.index.mockResolvedValue({
        _id: 'some-id',
        _index: '.kibana_streams_relationships',
        result: 'created',
        _version: 1,
        _seq_no: 1,
        _primary_term: 1,
        _shards: { total: 1, successful: 1, failed: 0 },
      });

      await relationshipClient.linkRelationship(relationship);

      expect(mockStorageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            [FROM_STREAM]: 'stream-a',
            [TO_STREAM]: 'stream-b',
            [RELATIONSHIP_DESCRIPTION]: 'Test relationship',
            [RELATIONSHIP_DIRECTION]: 'bidirectional',
            [RELATIONSHIP_SOURCE]: 'manual',
          }),
        })
      );
    });

    it('should include confidence score for auto-detected relationships', async () => {
      const relationship: Relationship = {
        from_stream: 'stream-a',
        to_stream: 'stream-b',
        description: 'Auto-detected relationship',
        direction: 'bidirectional',
        source: 'auto_detected',
        confidence: 0.85,
      };

      mockStorageClient.index.mockResolvedValue({
        _id: 'some-id',
        _index: '.kibana_streams_relationships',
        result: 'created',
        _version: 1,
        _seq_no: 1,
        _primary_term: 1,
        _shards: { total: 1, successful: 1, failed: 0 },
      });

      await relationshipClient.linkRelationship(relationship);

      expect(mockStorageClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          document: expect.objectContaining({
            [RELATIONSHIP_CONFIDENCE]: 0.85,
          }),
        })
      );
    });

    it('should sort stream names for bidirectional relationships', async () => {
      const relationship1: Relationship = {
        from_stream: 'z-stream',
        to_stream: 'a-stream',
        description: 'Test',
        direction: 'bidirectional',
        source: 'manual',
      };

      const relationship2: Relationship = {
        from_stream: 'a-stream',
        to_stream: 'z-stream',
        description: 'Test',
        direction: 'bidirectional',
        source: 'manual',
      };

      mockStorageClient.index.mockResolvedValue({
        _id: 'some-id',
        _index: '.kibana_streams_relationships',
        result: 'created',
        _version: 1,
        _seq_no: 1,
        _primary_term: 1,
        _shards: { total: 1, successful: 1, failed: 0 },
      });

      await relationshipClient.linkRelationship(relationship1);
      const id1 = mockStorageClient.index.mock.calls[0][0].id;

      await relationshipClient.linkRelationship(relationship2);
      const id2 = mockStorageClient.index.mock.calls[1][0].id;

      // Both should have the same UUID since they're bidirectional
      expect(id1).toBe(id2);
    });

    it('should not sort stream names for directional relationships', async () => {
      const relationship1: Relationship = {
        from_stream: 'z-stream',
        to_stream: 'a-stream',
        description: 'Test',
        direction: 'directional',
        source: 'manual',
      };

      const relationship2: Relationship = {
        from_stream: 'a-stream',
        to_stream: 'z-stream',
        description: 'Test',
        direction: 'directional',
        source: 'manual',
      };

      mockStorageClient.index.mockResolvedValue({
        _id: 'some-id',
        _index: '.kibana_streams_relationships',
        result: 'created',
        _version: 1,
        _seq_no: 1,
        _primary_term: 1,
        _shards: { total: 1, successful: 1, failed: 0 },
      });

      await relationshipClient.linkRelationship(relationship1);
      const id1 = mockStorageClient.index.mock.calls[0][0].id;

      await relationshipClient.linkRelationship(relationship2);
      const id2 = mockStorageClient.index.mock.calls[1][0].id;

      // Should have different UUIDs since they're directional
      expect(id1).not.toBe(id2);
    });
  });

  describe('unlinkRelationship', () => {
    it('should delete a relationship successfully', async () => {
      mockStorageClient.delete.mockResolvedValue({
        acknowledged: true,
        result: 'deleted',
      });

      await relationshipClient.unlinkRelationship('stream-a', 'stream-b', 'bidirectional');

      expect(mockStorageClient.delete).toHaveBeenCalled();
    });

    it('should throw RelationshipNotFoundError when relationship does not exist', async () => {
      mockStorageClient.delete.mockResolvedValue({
        acknowledged: true,
        result: 'not_found',
      });

      await expect(
        relationshipClient.unlinkRelationship('stream-a', 'stream-b', 'bidirectional')
      ).rejects.toThrow(RelationshipNotFoundError);
    });
  });

  describe('getRelationships', () => {
    it('should return relationships for a stream as source or target', async () => {
      const mockHits = [
        {
          _source: {
            [RELATIONSHIP_UUID]: 'uuid-1',
            [FROM_STREAM]: 'stream-a',
            [TO_STREAM]: 'stream-b',
            [RELATIONSHIP_DESCRIPTION]: 'Test 1',
            [RELATIONSHIP_DIRECTION]: 'bidirectional',
            [RELATIONSHIP_SOURCE]: 'manual',
            [RELATIONSHIP_UPDATED_AT]: '2024-01-01T00:00:00Z',
          },
        },
        {
          _source: {
            [RELATIONSHIP_UUID]: 'uuid-2',
            [FROM_STREAM]: 'stream-c',
            [TO_STREAM]: 'stream-a',
            [RELATIONSHIP_DESCRIPTION]: 'Test 2',
            [RELATIONSHIP_DIRECTION]: 'directional',
            [RELATIONSHIP_SOURCE]: 'auto_detected',
            [RELATIONSHIP_CONFIDENCE]: 0.9,
            [RELATIONSHIP_UPDATED_AT]: '2024-01-02T00:00:00Z',
          },
        },
      ];

      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: mockHits,
          total: { value: 2, relation: 'eq' },
        },
      } as any);

      const result = await relationshipClient.getRelationships('stream-a');

      expect(result.relationships).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.relationships[0]).toEqual({
        from_stream: 'stream-a',
        to_stream: 'stream-b',
        description: 'Test 1',
        direction: 'bidirectional',
        source: 'manual',
      });
      expect(result.relationships[1]).toEqual({
        from_stream: 'stream-c',
        to_stream: 'stream-a',
        description: 'Test 2',
        direction: 'directional',
        source: 'auto_detected',
        confidence: 0.9,
      });
    });

    it('should return empty array when no relationships exist', async () => {
      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await relationshipClient.getRelationships('stream-x');

      expect(result.relationships).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('deleteRelationshipsForStream', () => {
    it('should delete all relationships for a stream', async () => {
      const mockHits = [
        {
          _source: {
            [RELATIONSHIP_UUID]: 'uuid-1',
            [FROM_STREAM]: 'stream-a',
            [TO_STREAM]: 'stream-b',
            [RELATIONSHIP_DESCRIPTION]: 'Test 1',
            [RELATIONSHIP_DIRECTION]: 'bidirectional',
            [RELATIONSHIP_SOURCE]: 'manual',
            [RELATIONSHIP_UPDATED_AT]: '2024-01-01T00:00:00Z',
          },
        },
        {
          _source: {
            [RELATIONSHIP_UUID]: 'uuid-2',
            [FROM_STREAM]: 'stream-c',
            [TO_STREAM]: 'stream-a',
            [RELATIONSHIP_DESCRIPTION]: 'Test 2',
            [RELATIONSHIP_DIRECTION]: 'directional',
            [RELATIONSHIP_SOURCE]: 'manual',
            [RELATIONSHIP_UPDATED_AT]: '2024-01-02T00:00:00Z',
          },
        },
      ];

      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: mockHits,
          total: { value: 2, relation: 'eq' },
        },
      } as any);

      mockStorageClient.bulk.mockResolvedValue({
        errors: false,
        items: [],
        took: 1,
      });

      const result = await relationshipClient.deleteRelationshipsForStream('stream-a');

      expect(result.deleted).toBe(2);
      expect(mockStorageClient.bulk).toHaveBeenCalledWith({
        operations: expect.arrayContaining([
          expect.objectContaining({ delete: expect.any(Object) }),
          expect.objectContaining({ delete: expect.any(Object) }),
        ]),
        throwOnFail: true,
      });
    });

    it('should return 0 deleted when stream has no relationships', async () => {
      mockStorageClient.search.mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      } as any);

      const result = await relationshipClient.deleteRelationshipsForStream('stream-x');

      expect(result.deleted).toBe(0);
      expect(mockStorageClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('clean', () => {
    it('should clean the relationships index', async () => {
      mockStorageClient.clean.mockResolvedValue({ acknowledged: true, result: 'deleted' });

      await relationshipClient.clean();

      expect(mockStorageClient.clean).toHaveBeenCalled();
    });
  });
});
