/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';
import { performMatchSearch } from './perform_match_search';

jest.mock('./extract_snippets', () => ({
  extractSnippetsBatch: jest.fn(),
}));

import { extractSnippetsBatch } from './extract_snippets';

const extractSnippetsBatchMock = extractSnippetsBatch as jest.MockedFunction<
  typeof extractSnippetsBatch
>;

const createMockEsClient = (response: unknown = { hits: { hits: [] } }) =>
  ({
    search: jest.fn().mockResolvedValue(response),
  } as unknown as ElasticsearchClient);

const createMockLogger = () =>
  ({
    debug: jest.fn(),
  } as unknown as Logger);

const textField = (path: string): MappingField => ({ path, type: 'text', meta: {} });
const keywordField = (path: string): MappingField => ({ path, type: 'keyword', meta: {} });

describe('performMatchSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CCS targets (bool/should per-field match)', () => {
    it('uses a bool/should with one match clause per field', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await performMatchSearch({
        term: 'test query',
        index: 'remote_cluster:my-index',
        fields: [textField('title'), textField('body')],
        size: 10,
        esClient,
        logger,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.query.bool.should).toEqual([
        { match: { title: 'test query' } },
        { match: { body: 'test query' } },
      ]);
      expect(searchCall.query.bool.minimum_should_match).toBe(1);
    });

    it('does not use multi_match even when all fields are regular text', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await performMatchSearch({
        term: 'test query',
        index: 'remote_cluster:my-index',
        fields: [textField('title'), keywordField('status')],
        size: 10,
        esClient,
        logger,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.query.multi_match).toBeUndefined();
      expect(searchCall.query.bool).toBeDefined();
    });

    it('includes all fields in highlight config', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await performMatchSearch({
        term: 'test query',
        index: 'remote_cluster:my-index',
        fields: [textField('title'), textField('body')],
        size: 10,
        esClient,
        logger,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(Object.keys(searchCall.highlight.fields)).toEqual(
        expect.arrayContaining(['title', 'body'])
      );
    });
  });

  describe('local targets (RRF path)', () => {
    it('uses the RRF retriever with all fields', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await performMatchSearch({
        term: 'test query',
        index: 'my-local-index',
        fields: [textField('title'), textField('body')],
        size: 10,
        esClient,
        logger,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.retriever.rrf.fields).toEqual(['title', 'body']);
      expect(Object.keys(searchCall.highlight.fields)).toEqual(
        expect.arrayContaining(['title', 'body'])
      );
    });
  });

  describe('highlighting path (topSnippetsConfig not provided)', () => {
    it('includes highlight config in the search request', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await performMatchSearch({
        term: 'test query',
        index: 'my-local-index',
        fields: [textField('title')],
        size: 10,
        esClient,
        logger,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.highlight).toBeDefined();
      expect(searchCall.highlight.fields).toHaveProperty('title');
    });

    it('extracts snippets from ES highlight response', async () => {
      const esClient = createMockEsClient({
        hits: {
          hits: [
            {
              _id: 'doc1',
              _index: 'my-index',
              highlight: {
                title: ['match in title'],
                body: ['match in body 1', 'match in body 2'],
              },
            },
          ],
        },
      });
      const logger = createMockLogger();

      const { results } = await performMatchSearch({
        term: 'test query',
        index: 'my-local-index',
        fields: [textField('title'), textField('body')],
        size: 10,
        esClient,
        logger,
      });

      expect(results).toHaveLength(1);
      expect(results[0].snippets).toEqual(['match in title', 'match in body 1', 'match in body 2']);
    });

    it('returns empty snippets when no highlights are present', async () => {
      const esClient = createMockEsClient({
        hits: {
          hits: [{ _id: 'doc1', _index: 'my-index' }],
        },
      });
      const logger = createMockLogger();

      const { results } = await performMatchSearch({
        term: 'test query',
        index: 'my-local-index',
        fields: [textField('title')],
        size: 10,
        esClient,
        logger,
      });

      expect(results[0].snippets).toEqual([]);
    });

    it('does not call extractSnippetsBatch', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await performMatchSearch({
        term: 'test query',
        index: 'my-local-index',
        fields: [textField('title')],
        size: 10,
        esClient,
        logger,
      });

      expect(extractSnippetsBatchMock).not.toHaveBeenCalled();
    });
  });

  describe('TOP_SNIPPETS path (topSnippetsConfig provided)', () => {
    const topSnippetsConfig = { numSnippets: 2, numWords: 750 };

    it('omits highlight config from the search request', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();
      extractSnippetsBatchMock.mockResolvedValue(new Map());

      await performMatchSearch({
        term: 'test query',
        index: 'my-local-index',
        fields: [textField('title')],
        size: 10,
        esClient,
        logger,
        topSnippetsConfig,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.highlight).toBeUndefined();
    });

    it('omits highlight config for CCS targets too', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();
      extractSnippetsBatchMock.mockResolvedValue(new Map());

      await performMatchSearch({
        term: 'test query',
        index: 'remote_cluster:my-index',
        fields: [textField('title')],
        size: 10,
        esClient,
        logger,
        topSnippetsConfig,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.highlight).toBeUndefined();
    });

    it('calls extractSnippetsBatch with correct arguments', async () => {
      const esClient = createMockEsClient({
        hits: {
          hits: [
            { _id: 'doc1', _index: 'my-index' },
            { _id: 'doc2', _index: 'my-index' },
          ],
        },
      });
      const logger = createMockLogger();
      const fields = [textField('title'), textField('body')];
      extractSnippetsBatchMock.mockResolvedValue(new Map());

      await performMatchSearch({
        term: 'test query',
        index: 'my-index',
        fields,
        size: 10,
        esClient,
        logger,
        topSnippetsConfig,
      });

      expect(extractSnippetsBatchMock).toHaveBeenCalledWith({
        index: 'my-index',
        docIds: ['doc1', 'doc2'],
        term: 'test query',
        fields,
        config: topSnippetsConfig,
        esClient,
        logger,
      });
    });

    it('merges snippets into results preserving search order', async () => {
      const esClient = createMockEsClient({
        hits: {
          hits: [
            { _id: 'doc1', _index: 'my-index' },
            { _id: 'doc2', _index: 'my-index' },
            { _id: 'doc3', _index: 'my-index' },
          ],
        },
      });
      const logger = createMockLogger();

      const snippetsMap = new Map([
        ['doc1', ['snippet 1a', 'snippet 1b']],
        ['doc3', ['snippet 3a']],
      ]);
      extractSnippetsBatchMock.mockResolvedValue(snippetsMap);

      const { results } = await performMatchSearch({
        term: 'test query',
        index: 'my-index',
        fields: [textField('title')],
        size: 10,
        esClient,
        logger,
        topSnippetsConfig,
      });

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        id: 'doc1',
        index: 'my-index',
        snippets: ['snippet 1a', 'snippet 1b'],
      });
      expect(results[1]).toEqual({ id: 'doc2', index: 'my-index', snippets: [] });
      expect(results[2]).toEqual({ id: 'doc3', index: 'my-index', snippets: ['snippet 3a'] });
    });

    it('makes exactly one extractSnippetsBatch call per result set', async () => {
      const esClient = createMockEsClient({
        hits: {
          hits: [
            { _id: 'doc1', _index: 'my-index' },
            { _id: 'doc2', _index: 'my-index' },
          ],
        },
      });
      const logger = createMockLogger();
      extractSnippetsBatchMock.mockResolvedValue(new Map());

      await performMatchSearch({
        term: 'test query',
        index: 'my-index',
        fields: [textField('title')],
        size: 10,
        esClient,
        logger,
        topSnippetsConfig,
      });

      expect(extractSnippetsBatchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('response size guardrail', () => {
    it('throws a human-readable error when the response exceeds the max size', async () => {
      const esClient = {
        search: jest
          .fn()
          .mockRejectedValue(new errors.RequestAbortedError('Response content length exceeded')),
      } as unknown as ElasticsearchClient;
      const logger = createMockLogger();

      await expect(
        performMatchSearch({
          term: 'test query',
          index: 'my-local-index',
          fields: [textField('title')],
          size: 10,
          esClient,
          logger,
        })
      ).rejects.toThrow('Search response exceeded the maximum allowed size of 20MB.');
    });

    it('rethrows non-size errors unchanged', async () => {
      const originalError = new Error('some other ES error');
      const esClient = {
        search: jest.fn().mockRejectedValue(originalError),
      } as unknown as ElasticsearchClient;
      const logger = createMockLogger();

      await expect(
        performMatchSearch({
          term: 'test query',
          index: 'my-local-index',
          fields: [textField('title')],
          size: 10,
          esClient,
          logger,
        })
      ).rejects.toThrow(originalError);
    });
  });
});
