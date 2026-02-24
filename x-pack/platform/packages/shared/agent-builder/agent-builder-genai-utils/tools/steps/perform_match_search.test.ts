/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';
import { performMatchSearch } from './perform_match_search';

const createMockEsClient = (response: unknown = { hits: { hits: [] } }) =>
  ({
    search: jest.fn().mockResolvedValue(response),
  } as unknown as ElasticsearchClient);

const createMockLogger = () =>
  ({
    debug: jest.fn(),
  } as unknown as Logger);

const textField = (path: string): MappingField => ({ path, type: 'text', meta: {} });
const semanticField = (path: string): MappingField => ({
  path,
  type: 'semantic_text',
  meta: {},
});

describe('performMatchSearch', () => {
  describe('CCS targets', () => {
    it('uses multi_match when no fields are semantic_text', async () => {
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
      expect(searchCall.query.multi_match).toBeDefined();
      expect(searchCall.query.multi_match.fields).toEqual(['title', 'body']);
    });

    it('falls back to bool/should with per-field match queries when semantic_text fields are present', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await performMatchSearch({
        term: 'test query',
        index: 'remote_cluster:my-index',
        fields: [textField('title'), semanticField('embedding'), textField('body')],
        size: 10,
        esClient,
        logger,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.query.bool).toBeDefined();
      expect(searchCall.query.bool.should).toEqual([
        { match: { title: 'test query' } },
        { match: { embedding: 'test query' } },
        { match: { body: 'test query' } },
      ]);
      expect(searchCall.query.bool.minimum_should_match).toBe(1);
    });

    it('includes all fields in highlight config even when using bool/should fallback', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await performMatchSearch({
        term: 'test query',
        index: 'remote_cluster:my-index',
        fields: [textField('title'), semanticField('embedding')],
        size: 10,
        esClient,
        logger,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(Object.keys(searchCall.highlight.fields)).toEqual(
        expect.arrayContaining(['title', 'embedding'])
      );
    });

    it('uses bool/should when all fields are semantic_text', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await performMatchSearch({
        term: 'test query',
        index: 'remote_cluster:my-index',
        fields: [semanticField('embedding'), semanticField('vector')],
        size: 10,
        esClient,
        logger,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.query.bool.should).toEqual([
        { match: { embedding: 'test query' } },
        { match: { vector: 'test query' } },
      ]);
    });
  });

  describe('local targets (RRF path)', () => {
    it('includes semantic_text fields in the RRF retriever', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await performMatchSearch({
        term: 'test query',
        index: 'my-local-index',
        fields: [textField('title'), semanticField('embedding')],
        size: 10,
        esClient,
        logger,
      });

      const searchCall = (esClient.search as jest.Mock).mock.calls[0][0];
      expect(searchCall.retriever.rrf.fields).toEqual(['title', 'embedding']);
      expect(Object.keys(searchCall.highlight.fields)).toEqual(
        expect.arrayContaining(['title', 'embedding'])
      );
    });
  });
});
