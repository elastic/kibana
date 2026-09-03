/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { createVisualizationGraph } from './graph_lens';
import { buildLensConfig } from './build_lens_config';

jest.mock('./graph_lens', () => ({
  createVisualizationGraph: jest.fn(),
}));

const mockedCreateGraph = jest.mocked(createVisualizationGraph);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('buildLensConfig', () => {
  const events = {} as ToolEventEmitter;
  const esClient = { asCurrentUser: {} } as IScopedClusterClient;
  const modelProvider = {
    getDefaultModel: jest.fn().mockResolvedValue({}),
  } as unknown as ModelProvider;

  const PROVIDED_ESQL = 'FROM logs-* | STATS count = COUNT(*)';
  const AUTHORING_NOTE = 'Created a titleless metric showing the total log count.';

  let logger: Logger;
  let invoke: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    invoke = jest.fn().mockResolvedValue({
      validatedConfig: { type: 'metric' },
      authoringNote: AUTHORING_NOTE,
      error: null,
      esqlQuery: PROVIDED_ESQL,
    });
    mockedCreateGraph.mockReturnValue({ invoke } as unknown as ReturnType<
      typeof createVisualizationGraph
    >);
  });

  const run = (esql?: string) =>
    buildLensConfig({
      nlQuery: 'count of logs',
      chartType: SupportedChartType.Metric,
      esql,
      modelProvider,
      logger,
      events,
      esClient,
    });

  it('uses an explicitly provided chart type', async () => {
    const result = await run();

    expect(result.selectedChartType).toBe(SupportedChartType.Metric);
    expect(invoke).toHaveBeenCalledWith(
      expect.objectContaining({ chartType: SupportedChartType.Metric })
    );
  });

  it('preserves the existing supported chart type when none is provided', async () => {
    const result = await buildLensConfig({
      nlQuery: 'change the title',
      parsedExistingConfig: {
        type: SupportedChartType.XY,
        layers: [],
      },
      modelProvider,
      logger,
      events,
      esClient,
    });

    expect(result.selectedChartType).toBe(SupportedChartType.XY);
    expect(invoke).toHaveBeenCalledWith(
      expect.objectContaining({ chartType: SupportedChartType.XY })
    );
  });

  it('rejects a missing chart type when the existing type is unsupported', async () => {
    await expect(
      buildLensConfig({
        nlQuery: 'change the title',
        parsedExistingConfig: {
          // @ts-expect-error - invalid type
          type: 'unsupported',
        },
        modelProvider,
        logger,
        events,
        esClient,
      })
    ).rejects.toThrow('A supported chart type is required');

    expect(mockedCreateGraph).not.toHaveBeenCalled();
  });

  it('passes a provided ES|QL through to the graph verbatim', async () => {
    const result = await run(PROVIDED_ESQL);

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][0]).toMatchObject({ esqlQuery: PROVIDED_ESQL });
    expect(result.authoringNote).toBe(AUTHORING_NOTE);
  });

  it('passes a supplied query through even when it would previously have been dropped', async () => {
    const invalidLooking = 'FROM missing-* | STATS broken = NOT_A_FUNCTION()';
    await run(invalidLooking);
    expect(invoke.mock.calls[0][0]).toMatchObject({ esqlQuery: invalidLooking });
  });

  it('uses pinnedQueries[0] when esql is omitted', async () => {
    await buildLensConfig({
      nlQuery: 'count of logs',
      chartType: SupportedChartType.Metric,
      pinnedQueries: [PROVIDED_ESQL, 'FROM other-* | STATS c = COUNT(*)'],
      modelProvider,
      logger,
      events,
      esClient,
    });

    expect(invoke.mock.calls[0][0]).toMatchObject({
      esqlQuery: PROVIDED_ESQL,
    });
  });

  it('forwards intent, title, styleOverrides, styleRequest, and compileAllowList', async () => {
    const intent = { secondary: { column: 'bytes' } };
    const styleOverrides = { legend: { position: 'right' } };
    const compileAllowList = [SupportedChartType.Metric];

    await buildLensConfig({
      nlQuery: 'count of logs',
      chartType: SupportedChartType.Metric,
      intent,
      title: 'Requests',
      styleOverrides,
      styleRequest: 'make the legend right',
      compileAllowList,
      modelProvider,
      logger,
      events,
      esClient,
    });

    expect(invoke.mock.calls[0][0]).toMatchObject({
      intent,
      title: 'Requests',
      styleOverrides,
      styleRequest: 'make the legend right',
      compileAllowList,
    });
  });

  it('returns a valid config when the graph omits the authoring note', async () => {
    invoke.mockResolvedValue({
      validatedConfig: { type: 'metric' },
      error: null,
      esqlQuery: PROVIDED_ESQL,
    });

    await expect(run(PROVIDED_ESQL)).resolves.toEqual({
      selectedChartType: SupportedChartType.Metric,
      validatedConfig: { type: 'metric' },
      esqlQuery: PROVIDED_ESQL,
    });
  });

  it('throws the graph error when validatedConfig is missing', async () => {
    invoke.mockResolvedValue({
      validatedConfig: null,
      error: 'Could not probe columns for the visualization query: index_not_found',
      esqlQuery: PROVIDED_ESQL,
    });

    await expect(run(PROVIDED_ESQL)).rejects.toThrow(
      'Could not probe columns for the visualization query: index_not_found'
    );
  });

  it('does not invent an esqlQuery when none is provided or pinned', async () => {
    await run(undefined);
    expect(invoke.mock.calls[0][0]).toMatchObject({ esqlQuery: '' });
  });
});
