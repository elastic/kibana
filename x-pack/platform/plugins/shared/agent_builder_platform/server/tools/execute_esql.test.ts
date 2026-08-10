/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { executeEsql } from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { executeEsqlTool } from './execute_esql';

jest.mock('@kbn/agent-builder-genai-utils/tools/utils/esql', () => {
  const actual = jest.requireActual('@kbn/agent-builder-genai-utils/tools/utils/esql');
  return { ...actual, executeEsql: jest.fn() };
});

const executeEsqlMock = executeEsql as jest.MockedFunction<typeof executeEsql>;

describe('executeEsqlTool', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  const createContext = (spaceId = 'marketing') =>
    ({
      esClient,
      logger,
      spaceId,
      attachments: { getActive: () => [] },
    } as unknown as ToolHandlerContext);

  const run = (query: string, spaceId?: string) =>
    executeEsqlTool().handler({ query, limit: 100 }, createContext(spaceId));

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = elasticsearchServiceMock.createScopedClusterClient();
    logger = loggingSystemMock.createLogger();
    executeEsqlMock.mockResolvedValue({ columns: [], values: [] });
  });

  it('sends a space filter when the target indices map the spaces field', async () => {
    esClient.asCurrentUser.fieldCaps.mockResolvedValue({
      indices: ['ai-index-idx-sml-data'],
      fields: { spaces: { keyword: { type: 'keyword', searchable: true, aggregatable: true } } },
    } as never);

    await run('FROM ai-index-*');

    expect(executeEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          bool: {
            minimum_should_match: 1,
            should: [
              { terms: { spaces: ['marketing', '*'] } },
              { bool: { must_not: { exists: { field: 'spaces' } } } },
            ],
          },
        },
      })
    );
  });

  it('sends no filter when the target indices do not map the spaces field', async () => {
    esClient.asCurrentUser.fieldCaps.mockResolvedValue({
      indices: ['logs-000001'],
      fields: {},
    } as never);

    await run('FROM logs-*');

    expect(executeEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({ filter: undefined, query: 'FROM logs-*' })
    );
  });

  it('leaves an unrelated index that maps a spaces field completely alone', async () => {
    esClient.asCurrentUser.fieldCaps.mockResolvedValue({
      indices: ['meeting-rooms'],
      fields: { spaces: { keyword: { type: 'keyword', searchable: true, aggregatable: true } } },
    } as never);

    await run('FROM meeting-rooms');

    expect(executeEsqlMock).toHaveBeenCalledWith(
      expect.objectContaining({ filter: undefined, query: 'FROM meeting-rooms' })
    );
  });

  it('refuses a query that mixes AI indices with other indices', async () => {
    esClient.asCurrentUser.fieldCaps.mockResolvedValue({
      indices: ['ai-index-idx-sml-data', 'logs-000001'],
      fields: { spaces: { keyword: { type: 'keyword', searchable: true, aggregatable: true } } },
    } as never);

    const result = await run('FROM ai-index-*,logs-*');

    expect(result).toEqual({
      results: [
        expect.objectContaining({
          type: ToolResultType.error,
          data: { message: expect.stringMatching(/query them separately/) },
        }),
      ],
    });
    expect(executeEsqlMock).not.toHaveBeenCalled();
  });

  it('reads the space from the handler context rather than from tool arguments', async () => {
    esClient.asCurrentUser.fieldCaps.mockResolvedValue({
      indices: ['ai-index-idx-sml-data'],
      fields: { spaces: { keyword: { type: 'keyword', searchable: true, aggregatable: true } } },
    } as never);

    await run('FROM ai-index-*', 'engineering');

    const { filter } = executeEsqlMock.mock.calls[0][0];
    expect(filter?.bool?.should).toContainEqual({ terms: { spaces: ['engineering', '*'] } });
  });

  it('does not expose the filter as a tool parameter', () => {
    expect(Object.keys(executeEsqlTool().schema.shape)).toEqual([
      'query',
      'params',
      'time_range',
      'limit',
    ]);
  });

  it('reports a fail-closed scope resolution error instead of running the query', async () => {
    esClient.asCurrentUser.fieldCaps.mockRejectedValue(new Error('cluster_block_exception'));

    const result = await run('FROM ai-index-*');

    expect(result).toEqual({
      results: [
        expect.objectContaining({
          type: ToolResultType.error,
          data: { message: expect.stringMatching(/Could not determine the space scope/) },
        }),
      ],
    });
    expect(executeEsqlMock).not.toHaveBeenCalled();
  });
});
