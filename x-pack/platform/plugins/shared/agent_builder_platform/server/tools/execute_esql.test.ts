/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, ToolResultType } from '@kbn/agent-builder-common';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { executeEsqlTool } from './execute_esql';

jest.mock('@kbn/agent-builder-genai-utils/tools/utils/esql', () => {
  const actual = jest.requireActual('@kbn/agent-builder-genai-utils/tools/utils/esql');
  return {
    ...actual,
    executeEsql: jest.fn(),
  };
});

jest.mock('@kbn/agent-builder-server/tools', () => ({
  ...jest.requireActual('@kbn/agent-builder-server/tools'),
  getToolResultId: jest.fn(() => 'tool-result-id'),
}));

import { executeEsql } from '@kbn/agent-builder-genai-utils/tools/utils/esql';

const executeEsqlMock = executeEsql as jest.MockedFunction<typeof executeEsql>;

const emptyAttachments = {
  getActive: () => [],
} as unknown as AttachmentStateManager;

const createHandlerContext = () => ({
  esClient: {
    asCurrentUser: {},
  },
  attachments: emptyAttachments,
});

describe('executeEsqlTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    executeEsqlMock.mockResolvedValue({
      columns: [{ name: 'c', type: 'long' }],
      values: [[42]],
    });
  });

  it('has the platform execute_esql tool id', () => {
    expect(executeEsqlTool().id).toBe(platformCoreTools.executeEsql);
  });

  it('runs the query but returns a warning when explicit time_range has no ?_tstart/?_tend placeholders', async () => {
    const tool = executeEsqlTool();
    const result = (await tool.handler(
      {
        query: 'FROM logs | STATS c = COUNT(*)',
        time_range: { from: 'now-24h', to: 'now' },
        limit: 100,
      },
      createHandlerContext() as any
    )) as ToolHandlerStandardReturn;

    expect(executeEsqlMock).toHaveBeenCalledTimes(1);
    const esqlResults = result.results.find((r) => r.type === ToolResultType.esqlResults);
    expect(esqlResults?.data).not.toHaveProperty('time_range');

    const warning = result.results.find((r) => r.type === ToolResultType.other);
    expect(warning?.data).toMatchObject({
      warning: expect.stringContaining('time_range was not applied'),
    });
  });

  it('omits time_range from results when query has no placeholders and no explicit time_range', async () => {
    const tool = executeEsqlTool();
    const result = (await tool.handler(
      { query: 'FROM logs | STATS c = COUNT(*)', limit: 100 },
      createHandlerContext() as any
    )) as ToolHandlerStandardReturn;

    expect(executeEsqlMock).toHaveBeenCalledTimes(1);
    const esqlResults = result.results.find((r) => r.type === ToolResultType.esqlResults);
    expect(esqlResults?.data).not.toHaveProperty('time_range');
    expect(result.results.find((r) => r.type === ToolResultType.other)).toBeUndefined();
  });

  it('executes and includes time_range when both placeholders are present', async () => {
    const tool = executeEsqlTool();
    const timeRange = { from: 'now-24h', to: 'now' };
    const result = (await tool.handler(
      {
        query:
          'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS c = COUNT(*)',
        time_range: timeRange,
        limit: 100,
      },
      createHandlerContext() as any
    )) as ToolHandlerStandardReturn;

    expect(executeEsqlMock).toHaveBeenCalledTimes(1);
    const callParams = executeEsqlMock.mock.calls[0][0].params ?? [];
    expect(callParams.some((p) => '_tstart' in p)).toBe(true);
    expect(callParams.some((p) => '_tend' in p)).toBe(true);

    const esqlResults = result.results.find((r) => r.type === ToolResultType.esqlResults);
    expect(esqlResults?.data).toMatchObject({
      time_range: timeRange,
      values: [[42]],
    });
    expect(result.results.find((r) => r.type === ToolResultType.other)).toBeUndefined();
  });

  it('allows absolute @timestamp queries without explicit time_range and omits time_range from results', async () => {
    const tool = executeEsqlTool();
    const result = (await tool.handler(
      {
        query:
          'FROM logs | WHERE @timestamp >= "2026-07-06T20:00:00Z" AND @timestamp <= NOW() | LIMIT 1',
        limit: 100,
      },
      createHandlerContext() as any
    )) as ToolHandlerStandardReturn;

    expect(executeEsqlMock).toHaveBeenCalledTimes(1);
    const esqlResults = result.results.find((r) => r.type === ToolResultType.esqlResults);
    expect(esqlResults?.data).not.toHaveProperty('time_range');
  });

  describe('filter', () => {
    it('forwards a supplied filter to the ES|QL helper', async () => {
      const tool = executeEsqlTool();
      const filter = { term: { status: 'open' } };

      await tool.handler({ query: 'FROM logs', limit: 100, filter }, createHandlerContext() as any);

      expect(executeEsqlMock.mock.calls[0][0]).toMatchObject({ filter });
    });

    it('passes no filter when the caller omits one', async () => {
      const tool = executeEsqlTool();

      await tool.handler({ query: 'FROM logs', limit: 100 }, createHandlerContext() as any);

      expect(executeEsqlMock.mock.calls[0][0].filter).toBeUndefined();
    });

    it('keeps the filter out of the echoed ES|QL query', async () => {
      const tool = executeEsqlTool();
      const filter = { range: { '@timestamp': { gte: 'now-1h' } } };

      const result = (await tool.handler(
        {
          query: 'FROM logs | WHERE host == ?host',
          params: { host: 'server-1' },
          limit: 100,
          filter,
        },
        createHandlerContext() as any
      )) as ToolHandlerStandardReturn;

      expect(executeEsqlMock.mock.calls[0][0]).toMatchObject({
        query: 'FROM logs | WHERE host == ?host',
        filter,
      });

      const query = result.results.find((r) => r.type === ToolResultType.query);
      expect((query?.data as { esql: string }).esql).not.toContain('range');
    });

    it('accepts a verbose filter that stays under the size limit', () => {
      const filter = {
        bool: {
          should: Array.from({ length: 500 }, (_, i) => ({ term: { host: `server-${i}` } })),
          minimum_should_match: 1,
        },
      };

      expect(executeEsqlTool().schema.safeParse({ query: 'FROM logs', filter }).success).toBe(true);
    });

    it('rejects a filter that exceeds the size limit once serialized', () => {
      const filter = {
        bool: {
          should: Array.from({ length: 5000 }, (_, i) => ({ term: { host: `server-${i}` } })),
          minimum_should_match: 1,
        },
      };
      expect(JSON.stringify(filter).length).toBeGreaterThan(100_000);

      const result = executeEsqlTool().schema.safeParse({ query: 'FROM logs', filter });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('at most 100000 characters');
    });

    it('propagates a rejected filter so the runner can convert it into an error result', async () => {
      const tool = executeEsqlTool();
      executeEsqlMock.mockRejectedValue(new Error('parsing_exception: unknown query [nope]'));

      await expect(
        tool.handler(
          { query: 'FROM logs', limit: 100, filter: { nope: {} } },
          createHandlerContext() as any
        )
      ).rejects.toThrow('parsing_exception');
    });
  });
});
