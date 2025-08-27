/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoreExporter } from '../score_exporter';

const mockEsClient = {
  indices: {
    existsIndexTemplate: jest.fn(),
    putIndexTemplate: jest.fn(),
  },
  bulk: jest.fn(),
  search: jest.fn(),
} as any;
const mockLog = {
  info: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  success: jest.fn(),
} as any;

describe('ScoreExporter', () => {
  let exporter: ScoreExporter;

  beforeEach(() => {
    exporter = new ScoreExporter(mockEsClient, mockLog);
    jest.clearAllMocks();
  });

  describe('ensureIndexTemplate', () => {
    it('should create index template if it does not exist', async () => {
      mockEsClient.indices.existsIndexTemplate.mockRejectedValueOnce(new Error('Not found'));
      mockEsClient.indices.putIndexTemplate.mockResolvedValueOnce({});

      await (exporter as any).ensureIndexTemplate();

      expect(mockEsClient.indices.existsIndexTemplate).toHaveBeenCalledTimes(1);
      expect(mockEsClient.indices.existsIndexTemplate).toHaveBeenCalledWith({
        name: 'kibana-evals-scores-template',
      });
      expect(mockEsClient.indices.putIndexTemplate).toHaveBeenCalledWith({
        name: 'kibana-evals-scores-template',
        index_patterns: ['.kibana-evals-scores'],
        template: expect.any(Object),
      });
    });

    it('should not create template if it already exists', async () => {
      mockEsClient.indices.existsIndexTemplate.mockResolvedValueOnce(true);

      await (exporter as any).ensureIndexTemplate();

      expect(mockEsClient.indices.existsIndexTemplate).toHaveBeenCalledTimes(1);
      expect(mockEsClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    });
  });

  describe('calculateStats', () => {
    it('should calculate correct statistics', () => {
      const scores = [0.8, 0.9, 0.7, 1.0, 0.6];
      const totalExamples = 10;

      const stats = (exporter as any).calculateStats(scores, totalExamples);

      expect(stats.mean).toBeCloseTo(0.8, 2);
      expect(stats.count).toBe(5);
      expect(stats.min).toBe(0.6);
      expect(stats.max).toBe(1.0);
      expect(stats.percentage).toBeCloseTo(0.4, 2); // sum(scores) / totalExamples = 4.0 / 10 = 0.4
    });

    it('should handle empty scores array', () => {
      const stats = (exporter as any).calculateStats([], 10);

      expect(stats.mean).toBe(0);
      expect(stats.count).toBe(0);
      expect(stats.percentage).toBe(0);
    });
  });
});
