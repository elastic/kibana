/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';
import { extractSnippetsBatch } from './extract_snippets';

jest.mock('../utils/esql', () => ({
  executeEsql: jest.fn(),
}));

import { executeEsql } from '../utils/esql';

const executeEsqlMock = executeEsql as jest.MockedFunction<typeof executeEsql>;

const createMockEsClient = () => ({} as unknown as ElasticsearchClient);

const createMockLogger = () =>
  ({
    debug: jest.fn(),
  } as unknown as Logger);

const textField = (path: string): MappingField => ({ path, type: 'text', meta: {} });

const defaultConfig = { numSnippets: 2, numWords: 750 };

describe('extractSnippetsBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty map for empty docIds', async () => {
    const result = await extractSnippetsBatch({
      index: 'my-index',
      docIds: [],
      term: 'test',
      fields: [textField('title')],
      config: defaultConfig,
      esClient: createMockEsClient(),
      logger: createMockLogger(),
    });

    expect(result.size).toBe(0);
    expect(executeEsqlMock).not.toHaveBeenCalled();
  });

  it('returns empty map for empty fields', async () => {
    const result = await extractSnippetsBatch({
      index: 'my-index',
      docIds: ['doc1'],
      term: 'test',
      fields: [],
      config: defaultConfig,
      esClient: createMockEsClient(),
      logger: createMockLogger(),
    });

    expect(result.size).toBe(0);
    expect(executeEsqlMock).not.toHaveBeenCalled();
  });

  describe('ES|QL query construction', () => {
    it('builds correct query for a single field', async () => {
      executeEsqlMock.mockResolvedValue({ columns: [], values: [] });

      await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc1'],
        term: 'search term',
        fields: [textField('title')],
        config: { numSnippets: 2, numWords: 750 },
        esClient: createMockEsClient(),
        logger: createMockLogger(),
      });

      const query = executeEsqlMock.mock.calls[0][0].query;
      expect(query).toContain('FROM my-index METADATA _id');
      expect(query).toContain('| WHERE _id IN ("doc1")');
      expect(query).toContain('| EVAL doc = MV_DEDUPE(`title`)');
      expect(query).toContain(
        '| EVAL snippets = TOP_SNIPPETS(doc, "search term", {"num_snippets": 2, "num_words": 750})'
      );
      expect(query).toContain('| MV_EXPAND snippets');
      expect(query).toContain('| KEEP _id, snippets');
    });

    it('uses MV_APPEND for multiple fields', async () => {
      executeEsqlMock.mockResolvedValue({ columns: [], values: [] });

      await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc1'],
        term: 'test',
        fields: [textField('title'), textField('body'), textField('summary')],
        config: defaultConfig,
        esClient: createMockEsClient(),
        logger: createMockLogger(),
      });

      const query = executeEsqlMock.mock.calls[0][0].query;
      expect(query).toContain(
        '| EVAL doc = MV_DEDUPE(MV_APPEND(MV_APPEND(`title`, `body`), `summary`))'
      );
    });

    it('uses MV_APPEND for two fields', async () => {
      executeEsqlMock.mockResolvedValue({ columns: [], values: [] });

      await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc1'],
        term: 'test',
        fields: [textField('title'), textField('body')],
        config: defaultConfig,
        esClient: createMockEsClient(),
        logger: createMockLogger(),
      });

      const query = executeEsqlMock.mock.calls[0][0].query;
      expect(query).toContain('| EVAL doc = MV_DEDUPE(MV_APPEND(`title`, `body`))');
    });

    it('includes all doc IDs in the WHERE clause', async () => {
      executeEsqlMock.mockResolvedValue({ columns: [], values: [] });

      await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc1', 'doc2', 'doc3'],
        term: 'test',
        fields: [textField('title')],
        config: defaultConfig,
        esClient: createMockEsClient(),
        logger: createMockLogger(),
      });

      const query = executeEsqlMock.mock.calls[0][0].query;
      expect(query).toContain('| WHERE _id IN ("doc1", "doc2", "doc3")');
    });

    it('escapes special characters in doc IDs', async () => {
      executeEsqlMock.mockResolvedValue({ columns: [], values: [] });

      await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc"with"quotes', 'doc\\with\\backslashes'],
        term: 'test',
        fields: [textField('title')],
        config: defaultConfig,
        esClient: createMockEsClient(),
        logger: createMockLogger(),
      });

      const query = executeEsqlMock.mock.calls[0][0].query;
      expect(query).toContain('"doc\\"with\\"quotes"');
      expect(query).toContain('"doc\\\\with\\\\backslashes"');
    });

    it('escapes special characters in the search term', async () => {
      executeEsqlMock.mockResolvedValue({ columns: [], values: [] });

      await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc1'],
        term: 'term with "quotes" and \\backslashes',
        fields: [textField('title')],
        config: defaultConfig,
        esClient: createMockEsClient(),
        logger: createMockLogger(),
      });

      const query = executeEsqlMock.mock.calls[0][0].query;
      expect(query).toContain('TOP_SNIPPETS(doc, "term with \\"quotes\\" and \\\\backslashes"');
    });
  });

  describe('response parsing', () => {
    it('groups snippets by document ID', async () => {
      executeEsqlMock.mockResolvedValue({
        columns: [
          { name: '_id', type: 'keyword' },
          { name: 'snippets', type: 'keyword' },
        ],
        values: [
          ['doc1', 'snippet 1a'],
          ['doc1', 'snippet 1b'],
          ['doc2', 'snippet 2a'],
        ],
      });

      const result = await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc1', 'doc2'],
        term: 'test',
        fields: [textField('title')],
        config: defaultConfig,
        esClient: createMockEsClient(),
        logger: createMockLogger(),
      });

      expect(result.get('doc1')).toEqual(['snippet 1a', 'snippet 1b']);
      expect(result.get('doc2')).toEqual(['snippet 2a']);
    });

    it('deduplicates snippets within a document', async () => {
      executeEsqlMock.mockResolvedValue({
        columns: [
          { name: '_id', type: 'keyword' },
          { name: 'snippets', type: 'keyword' },
        ],
        values: [
          ['doc1', 'same snippet'],
          ['doc1', 'same snippet'],
          ['doc1', 'different snippet'],
        ],
      });

      const result = await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc1'],
        term: 'test',
        fields: [textField('title')],
        config: defaultConfig,
        esClient: createMockEsClient(),
        logger: createMockLogger(),
      });

      expect(result.get('doc1')).toEqual(['same snippet', 'different snippet']);
    });

    it('skips null snippet values', async () => {
      executeEsqlMock.mockResolvedValue({
        columns: [
          { name: '_id', type: 'keyword' },
          { name: 'snippets', type: 'keyword' },
        ],
        values: [
          ['doc1', null],
          ['doc1', 'valid snippet'],
        ],
      });

      const result = await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc1'],
        term: 'test',
        fields: [textField('title')],
        config: defaultConfig,
        esClient: createMockEsClient(),
        logger: createMockLogger(),
      });

      expect(result.get('doc1')).toEqual(['valid snippet']);
    });

    it('returns empty map when response has missing columns', async () => {
      executeEsqlMock.mockResolvedValue({
        columns: [{ name: 'unexpected', type: 'keyword' }],
        values: [],
      });
      const logger = createMockLogger();

      const result = await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc1'],
        term: 'test',
        fields: [textField('title')],
        config: defaultConfig,
        esClient: createMockEsClient(),
        logger,
      });

      expect(result.size).toBe(0);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('missing expected columns')
      );
    });
  });

  describe('error handling', () => {
    it('logs and rethrows ES|QL errors', async () => {
      const esqlError = new Error('ES|QL execution failed');
      executeEsqlMock.mockRejectedValue(esqlError);
      const logger = createMockLogger();

      await expect(
        extractSnippetsBatch({
          index: 'my-index',
          docIds: ['doc1'],
          term: 'test',
          fields: [textField('title')],
          config: defaultConfig,
          esClient: createMockEsClient(),
          logger,
        })
      ).rejects.toThrow(esqlError);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('TOP_SNIPPETS extraction failed')
      );
    });
  });

  describe('configuration', () => {
    it('passes custom numSnippets and numWords to the query', async () => {
      executeEsqlMock.mockResolvedValue({ columns: [], values: [] });

      await extractSnippetsBatch({
        index: 'my-index',
        docIds: ['doc1'],
        term: 'test',
        fields: [textField('title')],
        config: { numSnippets: 5, numWords: 200 },
        esClient: createMockEsClient(),
        logger: createMockLogger(),
      });

      const query = executeEsqlMock.mock.calls[0][0].query;
      expect(query).toContain('{"num_snippets": 5, "num_words": 200}');
    });
  });
});
