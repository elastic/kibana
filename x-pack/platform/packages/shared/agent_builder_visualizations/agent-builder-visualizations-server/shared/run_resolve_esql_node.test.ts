/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { probeEsqlColumns, resolveEsqlForAuthoring } from './resolve_esql_for_authoring';
import { runResolveEsqlNode } from './run_resolve_esql_node';

jest.mock('./resolve_esql_for_authoring', () => ({
  resolveEsqlForAuthoring: jest.fn(),
  probeEsqlColumns: jest.fn(),
}));

const mockedResolve = jest.mocked(resolveEsqlForAuthoring);
const mockedProbe = jest.mocked(probeEsqlColumns);

const COLUMNS = [{ name: 'count', type: 'long' as const }];
const logger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;
const events = {} as ToolEventEmitter;
const modelProvider = {} as ModelProvider;
const esClient = { asCurrentUser: {} } as IScopedClusterClient;

const params = {
  esqlQuery: 'FROM logs-* | STATS count = COUNT(*)',
  nlQuery: 'count logs',
  index: 'logs-*',
  existingQueries: ['FROM logs-*'],
  extraInstructions: 'vega-rules',
  modelProvider,
  events,
  logger,
  esClient,
};

describe('runResolveEsqlNode', () => {
  beforeEach(() => {
    mockedResolve.mockReset();
    mockedProbe.mockReset();
    jest.mocked(logger.error).mockClear();
  });

  it('keeps the stored query and only probes its columns on appearance-only edits', async () => {
    mockedProbe.mockResolvedValue(COLUMNS);

    const result = await runResolveEsqlNode({ ...params, preserveESQL: true });

    expect(mockedResolve).not.toHaveBeenCalled();
    expect(mockedProbe).toHaveBeenCalledWith(params.esqlQuery, esClient, logger);
    expect(result).toEqual({
      esqlQuery: params.esqlQuery,
      columns: COLUMNS,
      actions: [{ type: 'resolve_esql', success: true, query: params.esqlQuery, columns: COLUMNS }],
    });
  });

  it('maps a resolved query and columns onto a generate_esql action', async () => {
    mockedResolve.mockResolvedValue({
      query: 'FROM logs-* | STATS count = COUNT(*) BY status',
      columns: COLUMNS,
    });

    const result = await runResolveEsqlNode(params);

    expect(mockedResolve).toHaveBeenCalledWith({
      providedQuery: params.esqlQuery,
      nlQuery: params.nlQuery,
      index: params.index,
      existingQueries: params.existingQueries,
      extraInstructions: params.extraInstructions,
      modelProvider,
      events,
      logger,
      esClient,
    });
    expect(result).toEqual({
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY status',
      columns: COLUMNS,
      actions: [
        {
          type: 'resolve_esql',
          success: true,
          query: 'FROM logs-* | STATS count = COUNT(*) BY status',
          columns: COLUMNS,
        },
      ],
    });
  });

  it('maps a resolve error onto a failed generate_esql action', async () => {
    mockedResolve.mockResolvedValue({ error: 'no such index [logs-*]' });

    const result = await runResolveEsqlNode({ ...params, esqlQuery: '' });

    expect(result).toEqual({
      esqlQuery: '',
      columns: undefined,
      actions: [{ type: 'resolve_esql', success: false, error: 'no such index [logs-*]' }],
    });
  });

  it('maps a thrown resolve error onto a failed generate_esql action', async () => {
    mockedResolve.mockRejectedValue(new Error('connector unavailable'));

    const result = await runResolveEsqlNode(params);

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to resolve ES|QL query: connector unavailable'
    );
    expect(result).toEqual({
      esqlQuery: params.esqlQuery,
      columns: undefined,
      actions: [{ type: 'resolve_esql', success: false, error: 'connector unavailable' }],
    });
  });
});
