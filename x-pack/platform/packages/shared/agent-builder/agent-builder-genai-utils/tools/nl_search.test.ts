/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import { generateEsql } from './generate_esql';
import { naturalLanguageSearch } from './nl_search';

jest.mock('./generate_esql');

describe('naturalLanguageSearch', () => {
  const generateEsqlMock = jest.mocked(generateEsql);
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let model: ScopedModel;
  let events: ToolEventEmitter;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
    model = {} as ScopedModel;
    events = {
      reportProgress: jest.fn(),
      sendUiEvent: jest.fn(),
    };

    generateEsqlMock.mockResolvedValue({
      query: 'FROM logs-* | LIMIT 5',
      answer: 'query',
      results: {
        columns: [],
        values: [],
      },
    });
  });

  it('passes custom instructions unchanged for non-pattern targets', async () => {
    await naturalLanguageSearch({
      nlQuery: 'show me the last 5 docs',
      target: 'logs-default',
      model,
      esClient,
      logger,
      events,
      customInstructions: 'Prefer KEEP when possible',
    });

    expect(generateEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-default',
        additionalInstructions: 'Prefer KEEP when possible',
      })
    );
  });

  it('does not add extra instructions for wildcard targets', async () => {
    await naturalLanguageSearch({
      nlQuery: 'show me the last 5 docs',
      target: 'logs-*',
      model,
      esClient,
      logger,
      events,
    });

    expect(generateEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-*',
        additionalInstructions: undefined,
      })
    );
  });

  it('passes custom instructions unchanged for comma-separated targets', async () => {
    await naturalLanguageSearch({
      nlQuery: 'count events',
      target: 'logs-*,auditbeat-*',
      model,
      esClient,
      logger,
      events,
      customInstructions: 'Use ECS fields where possible',
    });

    expect(generateEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-*,auditbeat-*',
        additionalInstructions: 'Use ECS fields where possible',
      })
    );
  });
});
