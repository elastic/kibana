/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { generateVisualizationEsql } from './generate_visualization_esql';
import { CUSTOM_CONTENT_ESQL_INSTRUCTIONS, generateCustomContentEsql } from './custom_content_esql';

jest.mock('./generate_visualization_esql', () => ({
  generateVisualizationEsql: jest.fn(),
}));

const mockGenerate = generateVisualizationEsql as jest.Mock;

describe('generateCustomContentEsql', () => {
  const params = {
    nlQuery: 'a status card per host',
    index: 'logs-*',
    existingQueries: ['FROM logs-* | STATS count = COUNT(*) BY host'],
    modelProvider: {} as ModelProvider,
    events: {} as ToolEventEmitter,
    logger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger,
    esClient: {} as IScopedClusterClient,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerate.mockResolvedValue({ query: 'FROM logs-*' });
  });

  it('passes the request through with the custom content instructions', async () => {
    const result = await generateCustomContentEsql({ ...params, noQueryHint: 'Pass an index.' });

    expect(mockGenerate).toHaveBeenCalledWith({
      ...params,
      extraInstructions: CUSTOM_CONTENT_ESQL_INSTRUCTIONS,
    });
    expect(result).toBe('FROM logs-*');
  });

  it('throws with the reason and the caller hint when no query is produced', async () => {
    mockGenerate.mockResolvedValue({ query: undefined, error: 'index not found' });

    await expect(
      generateCustomContentEsql({ ...params, noQueryHint: 'Pass an index.' })
    ).rejects.toThrow(
      'Could not generate an ES|QL query for this panel: index not found. Pass an index.'
    );
  });

  it('says no query was produced when the generator gives no reason', async () => {
    mockGenerate.mockResolvedValue({ query: undefined });

    await expect(
      generateCustomContentEsql({ ...params, noQueryHint: 'Pass an index.' })
    ).rejects.toThrow('no query was produced. Pass an index.');
  });

  describe('instructions', () => {
    it('replaces the LIMIT 10 chart default with LIMIT 100', () => {
      expect(CUSTOM_CONTENT_ESQL_INSTRUCTIONS).toContain('LIMIT 100');
      expect(CUSTOM_CONTENT_ESQL_INSTRUCTIONS).toContain('Do NOT default to LIMIT 10');
    });

    it('keeps ordinal content in the order the user listed', () => {
      expect(CUSTOM_CONTENT_ESQL_INSTRUCTIONS).toContain('funnel');
      expect(CUSTOM_CONTENT_ESQL_INSTRUCTIONS).toContain('never sort a funnel by its values');
    });

    it('asks for one row per item', () => {
      expect(CUSTOM_CONTENT_ESQL_INSTRUCTIONS).toContain('one row per item');
    });

    it('shows how to build one row per step when each step has its own filter', () => {
      expect(CUSTOM_CONTENT_ESQL_INSTRUCTIONS).toContain(
        'never compute them as columns of one STATS row'
      );
      expect(CUSTOM_CONTENT_ESQL_INSTRUCTIONS).toContain('| FORK (STATS flights = COUNT(*)');
      expect(CUSTOM_CONTENT_ESQL_INSTRUCTIONS).toContain('SORT step_no');
    });
  });
});
