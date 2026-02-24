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
  describe('CCS targets (multi_match path)', () => {
    it('excludes semantic_text fields from the multi_match query', async () => {
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
      expect(searchCall.query.multi_match.fields).toEqual(['title', 'body']);
      expect(searchCall.query.multi_match.fields).not.toContain('embedding');
    });

    it('excludes semantic_text fields from highlight config', async () => {
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
      expect(Object.keys(searchCall.highlight.fields)).toEqual(['title']);
      expect(searchCall.highlight.fields).not.toHaveProperty('embedding');
    });

    it('throws when all fields are semantic_text', async () => {
      const esClient = createMockEsClient();
      const logger = createMockLogger();

      await expect(
        performMatchSearch({
          term: 'test query',
          index: 'remote_cluster:my-index',
          fields: [semanticField('embedding'), semanticField('vector')],
          size: 10,
          esClient,
          logger,
        })
      ).rejects.toThrow(/No multi_match-compatible fields available for CCS target/);
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
