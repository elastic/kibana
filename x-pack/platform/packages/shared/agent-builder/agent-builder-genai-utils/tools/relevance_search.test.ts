/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { relevanceSearch } from './relevance_search';
import { resolveResource } from './utils/resources';
import { performMatchSearch } from './steps';

jest.mock('./utils/resources');
jest.mock('./steps');

const resolveResourceMock = resolveResource as jest.Mock;
const performMatchSearchMock = performMatchSearch as jest.Mock;

describe('relevanceSearch', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let model: ScopedModel;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    model = {} as ScopedModel;
    performMatchSearchMock.mockResolvedValue({ results: [] });
  });

  describe('field type selection', () => {
    it('selects text fields', async () => {
      resolveResourceMock.mockResolvedValue({
        fields: [{ path: 'content', type: 'text', meta: {} }],
      });

      await relevanceSearch({
        term: 'test',
        target: 'my-index',
        esClient,
        model,
        logger,
      });

      expect(performMatchSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [{ path: 'content', type: 'text', meta: {} }],
        })
      );
    });

    it('selects semantic_text fields', async () => {
      resolveResourceMock.mockResolvedValue({
        fields: [{ path: 'embedding', type: 'semantic_text', meta: {} }],
      });

      await relevanceSearch({
        term: 'test',
        target: 'my-index',
        esClient,
        model,
        logger,
      });

      expect(performMatchSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [{ path: 'embedding', type: 'semantic_text', meta: {} }],
        })
      );
    });

    it('selects match_only_text fields', async () => {
      resolveResourceMock.mockResolvedValue({
        fields: [{ path: 'logs', type: 'match_only_text', meta: {} }],
      });

      await relevanceSearch({
        term: 'test',
        target: 'my-index',
        esClient,
        model,
        logger,
      });

      expect(performMatchSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [{ path: 'logs', type: 'match_only_text', meta: {} }],
        })
      );
    });

    it('selects pattern_text fields', async () => {
      resolveResourceMock.mockResolvedValue({
        fields: [{ path: 'pattern', type: 'pattern_text', meta: {} }],
      });

      await relevanceSearch({
        term: 'test',
        target: 'my-index',
        esClient,
        model,
        logger,
      });

      expect(performMatchSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [{ path: 'pattern', type: 'pattern_text', meta: {} }],
        })
      );
    });

    it('selects all supported text field types together', async () => {
      const allTextFields = [
        { path: 'content', type: 'text', meta: {} },
        { path: 'embedding', type: 'semantic_text', meta: {} },
        { path: 'logs', type: 'match_only_text', meta: {} },
        { path: 'pattern', type: 'pattern_text', meta: {} },
      ];

      resolveResourceMock.mockResolvedValue({
        fields: allTextFields,
      });

      await relevanceSearch({
        term: 'test',
        target: 'my-index',
        esClient,
        model,
        logger,
      });

      expect(performMatchSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: allTextFields,
        })
      );
    });

    it('filters out non-text field types', async () => {
      resolveResourceMock.mockResolvedValue({
        fields: [
          { path: 'content', type: 'text', meta: {} },
          { path: 'count', type: 'integer', meta: {} },
          { path: 'name', type: 'keyword', meta: {} },
          { path: 'timestamp', type: 'date', meta: {} },
          { path: 'embedding', type: 'semantic_text', meta: {} },
        ],
      });

      await relevanceSearch({
        term: 'test',
        target: 'my-index',
        esClient,
        model,
        logger,
      });

      expect(performMatchSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: [
            { path: 'content', type: 'text', meta: {} },
            { path: 'embedding', type: 'semantic_text', meta: {} },
          ],
        })
      );
    });

    it('throws an error when no searchable text fields are found', async () => {
      resolveResourceMock.mockResolvedValue({
        fields: [
          { path: 'count', type: 'integer', meta: {} },
          { path: 'name', type: 'keyword', meta: {} },
        ],
      });

      await expect(
        relevanceSearch({
          term: 'test',
          target: 'my-index',
          esClient,
          model,
          logger,
        })
      ).rejects.toThrow('No searchable text fields found, aborting search.');
    });
  });
});
