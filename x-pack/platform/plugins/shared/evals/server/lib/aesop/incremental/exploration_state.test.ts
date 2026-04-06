/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExplorationState } from './exploration_state';
import { ExplorationStateService } from './exploration_state';

describe('ExplorationStateService', () => {
  let mockEsClient: any;
  let mockLogger: any;
  let service: ExplorationStateService;

  const createMockState = (overrides?: Partial<ExplorationState>): ExplorationState => ({
    last_run_timestamp: '2026-03-20T10:00:00.000Z',
    discovered_indices: ['logs-app-2026.03.20', 'metrics-system-2026.03.20'],
    discovered_relationships: [
      {
        from: 'logs-app-2026.03.20',
        to: 'metrics-system-2026.03.20',
        via: 'host.name',
        confidence: 0.95,
      },
    ],
    discovered_patterns: [
      {
        pattern_id: 'pattern-1',
        frequency: 100,
        description: 'User login pattern',
      },
    ],
    generated_skills: ['skill-1', 'skill-2'],
    discovery_coverage: 85.5,
    total_runtime_ms: 120000,
    index_doc_counts: {
      'logs-app-2026.03.20': 1000,
      'metrics-system-2026.03.20': 5000,
    },
    index_mapping_fingerprints: {
      'logs-app-2026.03.20': 'abc123',
      'metrics-system-2026.03.20': 'def456',
    },
    ...overrides,
  });

  beforeEach(() => {
    mockEsClient = {
      indices: {
        exists: jest.fn(),
        create: jest.fn(),
      },
      index: jest.fn(),
      get: jest.fn(),
      search: jest.fn(),
      deleteByQuery: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = new ExplorationStateService(mockEsClient, mockLogger);
  });

  describe('saveState', () => {
    it('should create index on first save', async () => {
      mockEsClient.indices.exists.mockResolvedValue(false);
      mockEsClient.indices.create.mockResolvedValue({} as any);
      mockEsClient.index.mockResolvedValue({} as any);

      const state = createMockState();
      await service.saveState(state);

      expect(mockEsClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-exploration-state',
        })
      );
    });

    it('should save both historical and latest records', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);
      mockEsClient.deleteByQuery.mockResolvedValue({ deleted: 0 } as any);

      const state = createMockState();
      await service.saveState(state);

      expect(mockEsClient.index).toHaveBeenCalledTimes(2);

      // Historical record with timestamp ID
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-exploration-state',
          id: expect.stringMatching(/^state-\d{4}-\d{2}-\d{2}T/),
        })
      );

      // Latest pointer
      expect(mockEsClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.aesop-exploration-state',
          id: 'latest',
        })
      );
    });

    it('should include saved_at timestamp', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);
      mockEsClient.deleteByQuery.mockResolvedValue({ deleted: 0 } as any);

      const state = createMockState();
      await service.saveState(state);

      const historicalCall = mockEsClient.index.mock.calls[0][0];
      expect(historicalCall.document).toHaveProperty('saved_at');
      expect(historicalCall.document.saved_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should log state statistics', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);
      mockEsClient.deleteByQuery.mockResolvedValue({ deleted: 0 } as any);

      const state = createMockState();
      await service.saveState(state);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP State] Saved exploration state')
      );
    });

    it('should handle save errors gracefully', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockRejectedValue(new Error('ES connection failed'));

      const state = createMockState();

      await expect(service.saveState(state)).rejects.toThrow('Failed to save exploration state');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('loadLastState', () => {
    it('should return null when no state exists (first run)', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.get.mockRejectedValue({ statusCode: 404 });

      const result = await service.loadLastState();

      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('No previous state found')
      );
    });

    it('should load latest state successfully', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);

      const savedState = createMockState();
      mockEsClient.get.mockResolvedValue({
        _source: { ...savedState, saved_at: '2026-03-21T12:00:00.000Z' },
      } as any);

      const result = await service.loadLastState();

      expect(result).toMatchObject(savedState);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[AESOP State] Loaded last exploration state')
      );
    });

    it('should handle load errors', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.get.mockRejectedValue(new Error('ES query failed'));

      await expect(service.loadLastState()).rejects.toThrow('Failed to load exploration state');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getStateHistory', () => {
    it('should return historical states ordered by date', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);

      const states = [
        { ...createMockState(), saved_at: '2026-03-22T12:00:00.000Z' },
        { ...createMockState(), saved_at: '2026-03-21T12:00:00.000Z' },
        { ...createMockState(), saved_at: '2026-03-20T12:00:00.000Z' },
      ];

      mockEsClient.search.mockResolvedValue({
        hits: {
          hits: states.map((s) => ({ _source: s })),
        },
      } as any);

      const result = await service.getStateHistory(3);

      expect(result).toHaveLength(3);
      expect(result[0].saved_at).toBe('2026-03-22T12:00:00.000Z');
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [{ saved_at: 'desc' }],
          size: 3,
        })
      );
    });

    it('should exclude latest pointer from history', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [] },
      } as any);

      await service.getStateHistory();

      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must_not: {
                term: { _id: 'latest' },
              },
            }),
          }),
        })
      );
    });

    it('should handle empty history', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.search.mockResolvedValue({
        hits: { hits: [] },
      } as any);

      const result = await service.getStateHistory();

      expect(result).toEqual([]);
    });
  });

  describe('compareStates', () => {
    it('should identify new indices', () => {
      const previous = createMockState({
        discovered_indices: ['logs-app-2026.03.20'],
      });

      const current = createMockState({
        discovered_indices: [
          'logs-app-2026.03.20',
          'logs-app-2026.03.21',
          'metrics-new-2026.03.21',
        ],
      });

      const comparison = service.compareStates(current, previous);

      expect(comparison.new_indices).toEqual(['logs-app-2026.03.21', 'metrics-new-2026.03.21']);
      expect(comparison.removed_indices).toEqual([]);
    });

    it('should identify removed indices', () => {
      const previous = createMockState({
        discovered_indices: ['logs-app-2026.03.20', 'logs-old-2026.03.19'],
      });

      const current = createMockState({
        discovered_indices: ['logs-app-2026.03.20'],
      });

      const comparison = service.compareStates(current, previous);

      expect(comparison.removed_indices).toEqual(['logs-old-2026.03.19']);
    });

    it('should count new relationships', () => {
      const previous = createMockState({
        discovered_relationships: [{ from: 'idx1', to: 'idx2', via: 'field1', confidence: 0.9 }],
      });

      const current = createMockState({
        discovered_relationships: [
          { from: 'idx1', to: 'idx2', via: 'field1', confidence: 0.9 },
          { from: 'idx2', to: 'idx3', via: 'field2', confidence: 0.8 },
          { from: 'idx3', to: 'idx4', via: 'field3', confidence: 0.7 },
        ],
      });

      const comparison = service.compareStates(current, previous);

      expect(comparison.new_relationships).toBe(2);
    });

    it('should count new patterns and skills', () => {
      const previous = createMockState({
        discovered_patterns: [{ pattern_id: 'p1', frequency: 10, description: 'Pattern 1' }],
        generated_skills: ['skill-1'],
      });

      const current = createMockState({
        discovered_patterns: [
          { pattern_id: 'p1', frequency: 10, description: 'Pattern 1' },
          { pattern_id: 'p2', frequency: 20, description: 'Pattern 2' },
        ],
        generated_skills: ['skill-1', 'skill-2', 'skill-3'],
      });

      const comparison = service.compareStates(current, previous);

      expect(comparison.new_patterns).toBe(1);
      expect(comparison.new_skills).toBe(2);
    });

    it('should calculate coverage delta', () => {
      const previous = createMockState({ discovery_coverage: 75.0 });
      const current = createMockState({ discovery_coverage: 85.5 });

      const comparison = service.compareStates(current, previous);

      expect(comparison.coverage_delta).toBeCloseTo(10.5, 1);
    });

    it('should handle identical states', () => {
      const state = createMockState();
      const comparison = service.compareStates(state, state);

      expect(comparison.new_indices).toEqual([]);
      expect(comparison.removed_indices).toEqual([]);
      expect(comparison.new_relationships).toBe(0);
      expect(comparison.new_patterns).toBe(0);
      expect(comparison.new_skills).toBe(0);
      expect(comparison.coverage_delta).toBe(0);
    });
  });

  describe('index initialization', () => {
    it('should create index with correct mappings', async () => {
      mockEsClient.indices.exists.mockResolvedValue(false);
      mockEsClient.indices.create.mockResolvedValue({} as any);

      await (service as any).ensureIndexExists();

      const createCall = mockEsClient.indices.create.mock.calls[0][0];
      expect(createCall.index).toBe('.aesop-exploration-state');
      // Settings: ES v8 API uses 'index.hidden' key (with dot) for hidden indices
      expect(createCall.settings?.['index.hidden']).toBe(true);
      expect(createCall.mappings?.properties?.last_run_timestamp).toEqual({ type: 'date' });
      expect(createCall.mappings?.properties?.saved_at).toEqual({ type: 'date' });
      expect(createCall.mappings?.properties?.discovered_indices).toEqual({ type: 'keyword' });
      expect(createCall.mappings?.properties?.discovered_relationships?.type).toBe('nested');
    });

    it('should skip creation if index already exists', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);

      await (service as any).ensureIndexExists();

      expect(mockEsClient.indices.create).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should delete states older than retention period', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);
      mockEsClient.deleteByQuery.mockResolvedValue({ deleted: 5 } as any);

      const state = createMockState();
      await service.saveState(state);

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: [
                expect.objectContaining({
                  range: {
                    saved_at: {
                      lt: expect.any(String),
                    },
                  },
                }),
              ],
              must_not: {
                term: { _id: 'latest' },
              },
            }),
          }),
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cleaned up 5 old states')
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockEsClient.indices.exists.mockResolvedValue(true);
      mockEsClient.index.mockResolvedValue({} as any);
      mockEsClient.deleteByQuery.mockRejectedValue(new Error('Cleanup failed'));

      const state = createMockState();

      // Should not throw - cleanup is non-critical
      await expect(service.saveState(state)).resolves.not.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup'),
        expect.any(Error)
      );
    });
  });
});
