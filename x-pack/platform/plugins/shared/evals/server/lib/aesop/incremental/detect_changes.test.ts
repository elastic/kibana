/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeDetectionResult } from './detect_changes';
import { ChangeDetector, summarizeChanges } from './detect_changes';
import type { ExplorationState } from './exploration_state';

describe('ChangeDetector', () => {
  let mockEsClient: any;
  let mockLogger: any;
  let detector: ChangeDetector;

  const createMockState = (overrides?: Partial<ExplorationState>): ExplorationState => ({
    last_run_timestamp: '2026-03-20T10:00:00.000Z',
    discovered_indices: ['logs-app-2026.03.20', 'metrics-system-2026.03.20'],
    discovered_relationships: [],
    discovered_patterns: [],
    generated_skills: [],
    discovery_coverage: 80,
    total_runtime_ms: 60000,
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
      cat: {
        indices: jest.fn(),
      },
      indices: {
        getMapping: jest.fn(),
        stats: jest.fn(),
      },
      count: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    detector = new ChangeDetector(mockEsClient, mockLogger);
  });

  describe('detectChanges', () => {
    it('should return full exploration when no previous state exists', async () => {
      mockEsClient.cat.indices.mockResolvedValue([
        { index: 'logs-app-2026.03.21' },
        { index: 'metrics-system-2026.03.21' },
      ] as any);

      const result = await detector.detectChanges(['logs-*', 'metrics-*'], null);

      expect(result.is_full_exploration).toBe(true);
      expect(result.new_indices).toEqual(['logs-app-2026.03.21', 'metrics-system-2026.03.21']);
      expect(result.modified_indices).toEqual([]);
      expect(result.removed_indices).toEqual([]);
    });

    it('should detect incremental changes when previous state exists', async () => {
      const previousState = createMockState();

      mockEsClient.cat.indices.mockResolvedValue([
        { index: 'logs-app-2026.03.20' },
        { index: 'logs-app-2026.03.21' },
        { index: 'metrics-system-2026.03.20' },
      ] as any);

      mockEsClient.indices.getMapping.mockResolvedValue({
        'logs-app-2026.03.20': { mappings: {} },
        'metrics-system-2026.03.20': { mappings: {} },
      } as any);

      mockEsClient.indices.stats.mockResolvedValue({
        indices: {
          'logs-app-2026.03.20': { total: { docs: { count: 1000 } } },
          'metrics-system-2026.03.20': { total: { docs: { count: 5000 } } },
        },
      } as any);

      mockEsClient.count.mockResolvedValue({ count: 0 } as any);

      const result = await detector.detectChanges(['logs-*', 'metrics-*'], previousState);

      expect(result.is_full_exploration).toBe(false);
      expect(result.new_indices).toContain('logs-app-2026.03.21');
      expect(result.previous_exploration_timestamp).toBe('2026-03-20T10:00:00.000Z');
    });

    it('should log comprehensive change statistics', async () => {
      const previousState = createMockState();

      mockEsClient.cat.indices.mockResolvedValue([
        { index: 'logs-app-2026.03.20' },
        { index: 'logs-app-2026.03.21' },
      ] as any);

      mockEsClient.indices.getMapping.mockResolvedValue({
        'logs-app-2026.03.20': { mappings: {} },
      } as any);

      mockEsClient.indices.stats.mockResolvedValue({
        indices: {
          'logs-app-2026.03.20': { total: { docs: { count: 1000 } } },
        },
      } as any);

      mockEsClient.count.mockResolvedValue({ count: 100 } as any);

      await detector.detectChanges(['logs-*'], previousState);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Change detection completed')
      );
    });
  });

  describe('detectNewIndices', () => {
    it('should identify indices not in previous state', async () => {
      const previousState = createMockState({
        discovered_indices: ['logs-app-2026.03.20'],
      });

      mockEsClient.cat.indices.mockResolvedValue([
        { index: 'logs-app-2026.03.20' },
        { index: 'logs-app-2026.03.21' },
        { index: 'logs-app-2026.03.22' },
      ] as any);

      const result = await detector.detectNewIndices(['logs-*'], previousState);

      expect(result).toEqual(['logs-app-2026.03.21', 'logs-app-2026.03.22']);
    });

    it('should return all indices when no previous state', async () => {
      mockEsClient.cat.indices.mockResolvedValue([
        { index: 'logs-app-2026.03.21' },
        { index: 'metrics-system-2026.03.21' },
      ] as any);

      const result = await detector.detectNewIndices(['logs-*', 'metrics-*'], null);

      expect(result).toEqual(['logs-app-2026.03.21', 'metrics-system-2026.03.21']);
    });

    it('should return empty array when no new indices', async () => {
      const previousState = createMockState({
        discovered_indices: ['logs-app-2026.03.20', 'logs-app-2026.03.21'],
      });

      mockEsClient.cat.indices.mockResolvedValue([
        { index: 'logs-app-2026.03.20' },
        { index: 'logs-app-2026.03.21' },
      ] as any);

      const result = await detector.detectNewIndices(['logs-*'], previousState);

      expect(result).toEqual([]);
    });

    it('should handle index not found errors', async () => {
      mockEsClient.cat.indices.mockRejectedValue({
        statusCode: 404,
        message: 'index_not_found_exception',
      });

      const result = await detector.detectNewIndices(['nonexistent-*'], null);

      expect(result).toEqual([]);
    });
  });

  describe('detectModifiedIndices', () => {
    it('should detect mapping changes', async () => {
      const previousState = createMockState({
        discovered_indices: ['logs-app-2026.03.20'],
        index_mapping_fingerprints: {
          'logs-app-2026.03.20': 'old-fingerprint',
        },
      });

      mockEsClient.cat.indices.mockResolvedValue([{ index: 'logs-app-2026.03.20' }] as any);

      mockEsClient.indices.getMapping.mockResolvedValue({
        'logs-app-2026.03.20': {
          mappings: {
            properties: {
              new_field: { type: 'keyword' },
            },
          },
        },
      } as any);

      mockEsClient.indices.stats.mockResolvedValue({
        indices: {
          'logs-app-2026.03.20': { total: { docs: { count: 1000 } } },
        },
      } as any);

      const result = await detector.detectModifiedIndices(['logs-*'], previousState);

      expect(result).toContain('logs-app-2026.03.20');
    });

    it('should detect significant document count increases', async () => {
      const previousState = createMockState({
        discovered_indices: ['logs-app-2026.03.20'],
        index_doc_counts: {
          'logs-app-2026.03.20': 1000,
        },
        index_mapping_fingerprints: {
          'logs-app-2026.03.20': '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
        },
      });

      mockEsClient.cat.indices.mockResolvedValue([{ index: 'logs-app-2026.03.20' }] as any);

      // Simulate mapping staying the same
      mockEsClient.indices.getMapping.mockResolvedValue({
        'logs-app-2026.03.20': {
          mappings: {},
        },
      } as any);

      // 50% increase (above 20% threshold)
      mockEsClient.indices.stats.mockResolvedValue({
        indices: {
          'logs-app-2026.03.20': { total: { docs: { count: 1500 } } },
        },
      } as any);

      const result = await detector.detectModifiedIndices(['logs-*'], previousState);

      expect(result).toContain('logs-app-2026.03.20');
    });

    it('should not detect minor document count changes', async () => {
      const previousState = createMockState({
        discovered_indices: ['logs-app-2026.03.20'],
        index_doc_counts: {
          'logs-app-2026.03.20': 1000,
        },
        index_mapping_fingerprints: {
          'logs-app-2026.03.20': '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
        },
      });

      mockEsClient.cat.indices.mockResolvedValue([{ index: 'logs-app-2026.03.20' }] as any);

      mockEsClient.indices.getMapping.mockResolvedValue({
        'logs-app-2026.03.20': { mappings: {} },
      } as any);

      // 10% increase (below 20% threshold)
      mockEsClient.indices.stats.mockResolvedValue({
        indices: {
          'logs-app-2026.03.20': { total: { docs: { count: 1100 } } },
        },
      } as any);

      const result = await detector.detectModifiedIndices(['logs-*'], previousState);

      expect(result).not.toContain('logs-app-2026.03.20');
    });

    it('should return empty array when no previous state', async () => {
      const result = await detector.detectModifiedIndices(['logs-*'], null);
      expect(result).toEqual([]);
    });

    it('should deduplicate modifications from multiple sources', async () => {
      const previousState = createMockState({
        discovered_indices: ['logs-app-2026.03.20'],
        index_doc_counts: {
          'logs-app-2026.03.20': 1000,
        },
        index_mapping_fingerprints: {
          'logs-app-2026.03.20': 'old-fingerprint',
        },
      });

      mockEsClient.cat.indices.mockResolvedValue([{ index: 'logs-app-2026.03.20' }] as any);

      // Both mapping AND doc count changed
      mockEsClient.indices.getMapping.mockResolvedValue({
        'logs-app-2026.03.20': {
          mappings: { properties: { new_field: { type: 'keyword' } } },
        },
      } as any);

      mockEsClient.indices.stats.mockResolvedValue({
        indices: {
          'logs-app-2026.03.20': { total: { docs: { count: 2000 } } },
        },
      } as any);

      const result = await detector.detectModifiedIndices(['logs-*'], previousState);

      // Should appear only once despite being detected by both checks
      expect(result.filter((idx) => idx === 'logs-app-2026.03.20')).toHaveLength(1);
    });
  });

  describe('detectRemovedIndices', () => {
    it('should identify indices that no longer exist', async () => {
      const previousState = createMockState({
        discovered_indices: ['logs-app-2026.03.20', 'logs-app-2026.03.19', 'logs-old-2026.03.18'],
      });

      mockEsClient.cat.indices.mockResolvedValue([{ index: 'logs-app-2026.03.20' }] as any);

      const result = await detector.detectRemovedIndices(['logs-*'], previousState);

      expect(result).toEqual(['logs-app-2026.03.19', 'logs-old-2026.03.18']);
    });

    it('should log warning when indices are removed', async () => {
      const previousState = createMockState({
        discovered_indices: ['logs-deleted-2026.03.20'],
      });

      mockEsClient.cat.indices.mockResolvedValue([] as any);

      await detector.detectRemovedIndices(['logs-*'], previousState);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('removed indices'));
    });

    it('should return empty array when no previous state', async () => {
      const result = await detector.detectRemovedIndices(['logs-*'], null);
      expect(result).toEqual([]);
    });
  });

  describe('detectNewData', () => {
    it('should count new documents using @timestamp field', async () => {
      const previousState = createMockState({
        last_run_timestamp: '2026-03-20T10:00:00.000Z',
      });

      mockEsClient.cat.indices.mockResolvedValue([
        { index: 'logs-app-2026.03.20' },
        { index: 'logs-app-2026.03.21' },
      ] as any);

      // First index has 100 new docs, second has 250
      mockEsClient.count
        .mockResolvedValueOnce({ count: 100 } as any)
        .mockResolvedValueOnce({ count: 250 } as any);

      const result = await detector.detectNewData(['logs-*'], previousState);

      expect(result).toEqual({
        'logs-app-2026.03.20': 100,
        'logs-app-2026.03.21': 250,
      });

      expect(mockEsClient.count).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            range: {
              '@timestamp': {
                gte: '2026-03-20T10:00:00.000Z',
              },
            },
          },
        })
      );
    });

    it('should fallback to doc count comparison when @timestamp unavailable', async () => {
      const previousState = createMockState({
        last_run_timestamp: '2026-03-20T10:00:00.000Z',
        index_doc_counts: {
          'logs-no-timestamp-2026.03.20': 1000,
        },
      });

      mockEsClient.cat.indices.mockResolvedValue([
        { index: 'logs-no-timestamp-2026.03.20' },
      ] as any);

      // @timestamp query returns null (field doesn't exist)
      mockEsClient.count
        .mockRejectedValueOnce(new Error('Field @timestamp not found'))
        .mockResolvedValueOnce({ count: 1500 } as any); // Total count

      const result = await detector.detectNewData(['logs-*'], previousState);

      expect(result).toEqual({
        'logs-no-timestamp-2026.03.20': 500, // 1500 - 1000
      });
    });

    it('should exclude indices with zero new documents', async () => {
      const previousState = createMockState({
        last_run_timestamp: '2026-03-20T10:00:00.000Z',
      });

      mockEsClient.cat.indices.mockResolvedValue([{ index: 'logs-static-2026.03.20' }] as any);

      mockEsClient.count.mockResolvedValue({ count: 0 } as any);

      const result = await detector.detectNewData(['logs-*'], previousState);

      expect(result).toEqual({});
    });

    it('should handle count errors gracefully', async () => {
      const previousState = createMockState({
        last_run_timestamp: '2026-03-20T10:00:00.000Z',
      });

      mockEsClient.cat.indices.mockResolvedValue([{ index: 'logs-error-2026.03.20' }] as any);

      mockEsClient.count.mockRejectedValue(new Error('ES query failed'));

      const result = await detector.detectNewData(['logs-*'], previousState);

      expect(result).toEqual({});
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});

describe('summarizeChanges', () => {
  it('should format full exploration summary', () => {
    const result: ChangeDetectionResult = {
      new_indices: ['idx1', 'idx2', 'idx3'],
      modified_indices: [],
      removed_indices: [],
      new_document_counts: {},
      total_new_documents: 0,
      is_full_exploration: true,
    };

    const summary = summarizeChanges(result);

    expect(summary).toBe('Full exploration: 3 indices');
  });

  it('should format incremental summary with all change types', () => {
    const result: ChangeDetectionResult = {
      new_indices: ['idx1', 'idx2'],
      modified_indices: ['idx3'],
      removed_indices: ['idx4'],
      new_document_counts: { idx1: 1000, idx3: 500 },
      total_new_documents: 1500,
      is_full_exploration: false,
      previous_exploration_timestamp: '2026-03-20T10:00:00.000Z',
    };

    const summary = summarizeChanges(result);

    expect(summary).toContain('2 new indices');
    expect(summary).toContain('1 modified');
    expect(summary).toContain('1 removed');
    expect(summary).toContain('1,500 new docs');
  });

  it('should handle no changes detected', () => {
    const result: ChangeDetectionResult = {
      new_indices: [],
      modified_indices: [],
      removed_indices: [],
      new_document_counts: {},
      total_new_documents: 0,
      is_full_exploration: false,
    };

    const summary = summarizeChanges(result);

    expect(summary).toBe('No changes detected');
  });

  it('should format large document counts with commas', () => {
    const result: ChangeDetectionResult = {
      new_indices: [],
      modified_indices: [],
      removed_indices: [],
      new_document_counts: {},
      total_new_documents: 1234567,
      is_full_exploration: false,
    };

    const summary = summarizeChanges(result);

    expect(summary).toContain('1,234,567 new docs');
  });
});
