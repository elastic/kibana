/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildLensConfig, buildVegaConfig } from '@kbn/agent-builder-visualizations-server';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createVisPanelResolver } from './vis_panel_resolver';

jest.mock('@kbn/agent-builder-visualizations-server', () => ({
  buildLensConfig: jest.fn(),
  buildVegaConfig: jest.fn(),
}));

const mockedBuildLensConfig = jest.mocked(buildLensConfig);
const mockedBuildVegaConfig = jest.mocked(buildVegaConfig);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('createVisPanelResolver', () => {
  const logger = createMockLogger();
  const modelProvider = {} as ModelProvider;
  const events = {} as ToolEventEmitter;
  const esClient = {} as IScopedClusterClient;
  const createBuildLensConfigResult = (
    validatedConfig: Record<string, unknown>
  ): Awaited<ReturnType<typeof buildLensConfig>> =>
    ({
      validatedConfig,
      selectedChartType: 'metric',
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*)',
    } as Awaited<ReturnType<typeof buildLensConfig>>);

  beforeEach(() => {
    mockedBuildLensConfig.mockReset();
    mockedBuildVegaConfig.mockReset();
  });

  it('creates Lens panel content for create requests', async () => {
    mockedBuildLensConfig.mockResolvedValue(createBuildLensConfigResult({ type: 'metric' }));

    const resolveVisPanel = createVisPanelResolver({
      logger,
      modelProvider,
      events,
      esClient,
    });

    const result = await resolveVisPanel({
      type: 'vis',
      operationType: 'add_panels',
      identifier: 'show total requests',
      nlQuery: 'show total requests',
      index: 'logs-*',
    });

    expect(result).toEqual({
      type: 'success',
      panelContent: {
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
      },
    });
    expect(mockedBuildLensConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        includeTimeRange: false,
      })
    );
  });

  it('passes the existing Lens config when editing a Lens panel', async () => {
    mockedBuildLensConfig.mockResolvedValue(createBuildLensConfigResult({ type: 'line' }));

    const resolveVisPanel = createVisPanelResolver({
      logger,
      modelProvider,
      events,
      esClient,
    });

    await resolveVisPanel({
      type: 'vis',
      operationType: 'edit_panels',
      identifier: 'panel-1',
      nlQuery: 'turn this into a line chart',
      existingPanel: {
        id: 'panel-1',
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'bar' },
        grid: { w: 24, h: 12, x: 0, y: 0 },
      },
    });

    expect(mockedBuildLensConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        existingConfig: JSON.stringify({ type: 'bar' }),
        parsedExistingConfig: { type: 'bar' },
      })
    );
  });

  it('creates a Vega panel in the attachment API shape (config.spec) when renderer is "vega"', async () => {
    const spec = '{"$schema":"https://vega.github.io/schema/vega-lite/v6.json"}';
    mockedBuildVegaConfig.mockResolvedValue({ spec, esqlQuery: 'FROM logs-*' });

    const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

    const result = await resolveVisPanel({
      type: 'vis',
      operationType: 'add_panels',
      identifier: 'a small multiples chart',
      nlQuery: 'a small multiples chart',
      index: 'logs-*',
      renderer: 'vega',
    });

    expect(result).toEqual({
      type: 'success',
      panelContent: {
        type: VEGA_VIS_TYPE,
        config: { spec },
      },
    });
    expect(mockedBuildVegaConfig).toHaveBeenCalledWith(
      expect.objectContaining({ nlQuery: 'a small multiples chart', existingSpec: undefined })
    );
    expect(mockedBuildLensConfig).not.toHaveBeenCalled();
  });

  it('defaults to Lens when renderer is omitted on a create request', async () => {
    mockedBuildLensConfig.mockResolvedValue(createBuildLensConfigResult({ type: 'metric' }));

    const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

    const result = await resolveVisPanel({
      type: 'vis',
      operationType: 'add_panels',
      identifier: 'total requests',
      nlQuery: 'total requests',
    });

    expect(result.type).toBe('success');
    expect(mockedBuildVegaConfig).not.toHaveBeenCalled();
    expect(mockedBuildLensConfig).toHaveBeenCalled();
  });

  it('keeps the Vega renderer and reuses the embedded spec when editing a vega panel', async () => {
    const existingSpec = '{"$schema":"vega-lite","mark":"bar"}';
    const nextSpec = '{"$schema":"vega-lite","mark":"line"}';
    mockedBuildVegaConfig.mockResolvedValue({ spec: nextSpec, esqlQuery: 'FROM logs-*' });

    const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

    const result = await resolveVisPanel({
      type: 'vis',
      operationType: 'edit_panels',
      identifier: 'panel-1',
      nlQuery: 'make it a line chart',
      // A stale "lens" request must be ignored: edits keep the existing renderer.
      renderer: 'lens',
      existingPanel: {
        id: 'panel-1',
        type: VEGA_VIS_TYPE,
        config: { spec: existingSpec },
        grid: { w: 24, h: 12, x: 0, y: 0 },
      },
    });

    expect(result).toEqual({
      type: 'success',
      panelContent: {
        type: VEGA_VIS_TYPE,
        config: { spec: nextSpec },
      },
    });
    expect(mockedBuildVegaConfig).toHaveBeenCalledWith(expect.objectContaining({ existingSpec }));
    expect(mockedBuildLensConfig).not.toHaveBeenCalled();
  });

  it('returns a failure when editing a non-Lens panel', async () => {
    const resolveVisPanel = createVisPanelResolver({
      logger,
      modelProvider,
      events,
      esClient,
    });

    const result = await resolveVisPanel({
      type: 'vis',
      operationType: 'edit_panels',
      identifier: 'panel-1',
      nlQuery: 'refine this analysis',
      existingPanel: {
        id: 'panel-1',
        type: 'aiOpsLogRateAnalysis',
        config: { seriesType: 'log_rate' },
        grid: { w: 24, h: 12, x: 0, y: 0 },
      },
    });

    expect(result).toEqual({
      type: 'failure',
      failure: {
        type: 'edit_panels',
        identifier: 'panel-1',
        error:
          'Panel "panel-1" with type "aiOpsLogRateAnalysis" is not supported for inline visualization editing.',
      },
    });
    expect(mockedBuildLensConfig).not.toHaveBeenCalled();
    expect(mockedBuildVegaConfig).not.toHaveBeenCalled();
  });
});
