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
const keywordField = (path: string): MappingField => ({ path, type: 'keyword', meta: {} });

describe('performMatchSearch', () => {
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
});
