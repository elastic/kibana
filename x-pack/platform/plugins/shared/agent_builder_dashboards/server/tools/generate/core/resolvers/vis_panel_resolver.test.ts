/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildLensConfig,
  buildVegaConfig,
  extractEsqlFromSpec,
} from '@kbn/agent-builder-visualizations-server';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createVisPanelResolver } from './vis_panel_resolver';

jest.mock('@kbn/agent-builder-visualizations-server', () => ({
  buildLensConfig: jest.fn(),
  buildVegaConfig: jest.fn(),
  extractEsqlFromSpec: jest.fn(),
  // Real implementation: the resolver reads existing queries through it.
  getEsqlDataSourceCarriers: (config: unknown) => {
    if (!config || typeof config !== 'object') return [];
    const { layers } = config as { layers?: unknown };
    return Array.isArray(layers) ? layers : [config];
  },
}));

const mockedBuildLensConfig = jest.mocked(buildLensConfig);
const mockedBuildVegaConfig = jest.mocked(buildVegaConfig);
const mockedExtractEsqlFromSpec = jest.mocked(extractEsqlFromSpec);

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
    mockedExtractEsqlFromSpec.mockReset();
  });

  const lensPanelWithQuery = (query: string) => ({
    id: 'panel-1',
    type: LENS_EMBEDDABLE_TYPE,
    config: { type: 'metric', data_source: { type: 'esql', query } },
    grid: { w: 24, h: 12, x: 0, y: 0 },
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
        config: {
          type: 'bar',
          data_source: { type: 'esql', query: 'FROM logs-* | STATS count = COUNT(*)' },
        },
        grid: { w: 24, h: 12, x: 0, y: 0 },
      },
    });

    expect(mockedBuildLensConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        existingConfig: JSON.stringify({
          type: 'bar',
          data_source: { type: 'esql', query: 'FROM logs-* | STATS count = COUNT(*)' },
        }),
        parsedExistingConfig: {
          type: 'bar',
          data_source: { type: 'esql', query: 'FROM logs-* | STATS count = COUNT(*)' },
        },
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
    const existingSpec =
      '{"$schema":"vega-lite","mark":"bar","data":{"url":{"%type%":"esql","query":"FROM logs-*"}}}';
    const nextSpec = '{"$schema":"vega-lite","mark":"line"}';
    mockedExtractEsqlFromSpec.mockReturnValue('FROM logs-*');
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
    expect(mockedBuildVegaConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        existingSpec,
        esql: 'FROM logs-*',
        regenerateInvalidEsql: false,
      })
    );
    expect(mockedBuildLensConfig).not.toHaveBeenCalled();
  });

  describe('ES|QL pinning on Lens edits', () => {
    const PINNED_QUERY = 'FROM logs-* | STATS count = COUNT(*) BY host.name';

    it('pins the existing query byte-identical when neither new_esql nor change_data is given', async () => {
      // Echo the received esql into the produced config, like the real builder
      // does for a pinned query, so byte-identity is asserted end to end.
      mockedBuildLensConfig.mockImplementation(async ({ esql }) =>
        createBuildLensConfigResult({
          type: 'metric',
          data_source: { type: 'esql', query: esql },
        })
      );

      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      const result = await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        nlQuery: 'make the number red',
        existingPanel: lensPanelWithQuery(PINNED_QUERY),
      });

      expect(mockedBuildLensConfig).toHaveBeenCalledWith(
        expect.objectContaining({ esql: PINNED_QUERY, regenerateInvalidEsql: false })
      );
      expect(result).toEqual({
        type: 'success',
        panelContent: {
          type: LENS_EMBEDDABLE_TYPE,
          config: expect.objectContaining({
            data_source: { type: 'esql', query: PINNED_QUERY },
          }),
        },
      });
    });

    it('propagates a pinned query validation error as a per-panel failure', async () => {
      mockedBuildLensConfig.mockRejectedValue(
        new Error('Provided ES|QL failed validation: Unknown index [logs-*]')
      );

      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      const result = await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        failureId: 'failure-1',
        nlQuery: 'make the number red',
        existingPanel: lensPanelWithQuery(PINNED_QUERY),
      });

      expect(result).toEqual({
        type: 'failure',
        failure: expect.objectContaining({
          identifier: 'panel-1',
          failureId: 'failure-1',
          error: expect.stringContaining('Unknown index [logs-*]'),
        }),
      });
      expect(mockedBuildLensConfig).toHaveBeenCalledWith(
        expect.objectContaining({ esql: PINNED_QUERY, regenerateInvalidEsql: false })
      );
    });

    it('uses new_esql verbatim when provided', async () => {
      mockedBuildLensConfig.mockResolvedValue(createBuildLensConfigResult({ type: 'metric' }));

      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        nlQuery: 'show errors instead',
        newEsql: 'FROM logs-* | WHERE level == "error" | STATS count = COUNT(*)',
        existingPanel: lensPanelWithQuery(PINNED_QUERY),
      });

      expect(mockedBuildLensConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          esql: 'FROM logs-* | WHERE level == "error" | STATS count = COUNT(*)',
          regenerateInvalidEsql: false,
        })
      );
    });

    it('regenerates (esql undefined) when change_data is set', async () => {
      mockedBuildLensConfig.mockResolvedValue(createBuildLensConfigResult({ type: 'metric' }));

      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        nlQuery: 'break it down by region instead',
        index: 'logs-*',
        changeData: true,
        existingPanel: lensPanelWithQuery(PINNED_QUERY),
      });

      expect(mockedBuildLensConfig).toHaveBeenCalledWith(
        expect.objectContaining({ esql: undefined, index: 'logs-*' })
      );
    });

    it('fails closed for multi-query (multi-layer) panels without change_data', async () => {
      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      const result = await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        failureId: 'failure-2',
        nlQuery: 'restyle the chart',
        existingPanel: {
          id: 'panel-1',
          type: LENS_EMBEDDABLE_TYPE,
          config: {
            type: 'xy',
            layers: [
              { data_source: { type: 'esql', query: 'FROM a | STATS c = COUNT(*)' } },
              { data_source: { type: 'esql', query: 'FROM b | STATS c = COUNT(*)' } },
            ],
          },
          grid: { w: 24, h: 12, x: 0, y: 0 },
        },
      });

      expect(result).toEqual({
        type: 'failure',
        failure: expect.objectContaining({
          failureId: 'failure-2',
          error: expect.stringContaining('multiple distinct ES|QL queries'),
        }),
      });
      expect(mockedBuildLensConfig).not.toHaveBeenCalled();
    });

    it('pins a query shared by every layer', async () => {
      mockedBuildLensConfig.mockResolvedValue(createBuildLensConfigResult({ type: 'xy' }));
      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      const result = await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        nlQuery: 'restyle the chart',
        existingPanel: {
          id: 'panel-1',
          type: LENS_EMBEDDABLE_TYPE,
          config: {
            type: 'xy',
            layers: [
              { data_source: { type: 'esql', query: PINNED_QUERY } },
              { data_source: { type: 'esql', query: PINNED_QUERY } },
            ],
          },
          grid: { w: 24, h: 12, x: 0, y: 0 },
        },
      });

      expect(result.type).toBe('success');
      expect(mockedBuildLensConfig).toHaveBeenCalledWith(
        expect.objectContaining({ esql: PINNED_QUERY, regenerateInvalidEsql: false })
      );
    });

    it('fails closed for non-ES|QL and mixed-data Lens panels without change_data', async () => {
      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });
      const panels = [
        {
          type: 'metric',
          data_source: { type: 'form_based' },
        },
        {
          type: 'xy',
          layers: [
            { data_source: { type: 'esql', query: PINNED_QUERY } },
            { data_source: { type: 'form_based' } },
          ],
        },
      ];

      for (const config of panels) {
        const result = await resolveVisPanel({
          type: 'vis',
          operationType: 'edit_panels',
          identifier: 'panel-1',
          nlQuery: 'restyle the chart',
          existingPanel: {
            id: 'panel-1',
            type: LENS_EMBEDDABLE_TYPE,
            config,
            grid: { w: 24, h: 12, x: 0, y: 0 },
          },
        });

        expect(result).toEqual({
          type: 'failure',
          failure: expect.objectContaining({
            error: expect.stringContaining('not exclusively ES|QL'),
          }),
        });
      }

      expect(mockedBuildLensConfig).not.toHaveBeenCalled();
    });
  });

  describe('ES|QL pinning on Vega edits', () => {
    const existingSpec = '{"mark":"bar"}';
    const PINNED_QUERY = 'FROM logs-* | STATS count = COUNT(*)';

    const vegaPanel = {
      id: 'panel-1',
      type: VEGA_VIS_TYPE,
      config: { spec: existingSpec },
      grid: { w: 24, h: 12, x: 0, y: 0 },
    };

    it('pins the query recovered from the existing spec for a visual-only edit', async () => {
      mockedExtractEsqlFromSpec.mockReturnValue(PINNED_QUERY);
      mockedBuildVegaConfig.mockResolvedValue({ spec: existingSpec, esqlQuery: PINNED_QUERY });
      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        nlQuery: 'make the bars blue',
        existingPanel: vegaPanel,
      });

      expect(mockedBuildVegaConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          esql: PINNED_QUERY,
          existingSpec,
          regenerateInvalidEsql: false,
        })
      );
    });

    it('regenerates from the existing spec context when change_data is true', async () => {
      mockedBuildVegaConfig.mockResolvedValue({ spec: existingSpec, esqlQuery: PINNED_QUERY });
      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        nlQuery: 'break it down by region',
        changeData: true,
        existingPanel: vegaPanel,
      });

      expect(mockedBuildVegaConfig).toHaveBeenCalledWith(
        expect.objectContaining({ esql: undefined, existingSpec })
      );
    });

    it('honors new_esql verbatim', async () => {
      const newEsql = 'FROM metrics-* | STATS avg = AVG(cpu)';
      mockedBuildVegaConfig.mockResolvedValue({ spec: existingSpec, esqlQuery: newEsql });
      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        nlQuery: 'show CPU instead',
        newEsql,
        existingPanel: vegaPanel,
      });

      expect(mockedBuildVegaConfig).toHaveBeenCalledWith(
        expect.objectContaining({ esql: newEsql, regenerateInvalidEsql: false })
      );
    });

    it('fails closed when a visual-only edit cannot recover ES|QL', async () => {
      mockedExtractEsqlFromSpec.mockReturnValue(undefined);
      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      const result = await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        failureId: 'failure-3',
        nlQuery: 'make the bars blue',
        existingPanel: vegaPanel,
      });

      expect(result).toEqual({
        type: 'failure',
        failure: expect.objectContaining({
          failureId: 'failure-3',
          error: expect.stringContaining('does not contain an ES|QL query'),
        }),
      });
      expect(mockedBuildVegaConfig).not.toHaveBeenCalled();
    });

    it('propagates a pinned Vega query failure with its recovery id', async () => {
      mockedExtractEsqlFromSpec.mockReturnValue(PINNED_QUERY);
      mockedBuildVegaConfig.mockRejectedValue(new Error('Pinned Vega query failed to execute'));
      const resolveVisPanel = createVisPanelResolver({ logger, modelProvider, events, esClient });

      const result = await resolveVisPanel({
        type: 'vis',
        operationType: 'edit_panels',
        identifier: 'panel-1',
        failureId: 'failure-4',
        nlQuery: 'make the bars blue',
        existingPanel: vegaPanel,
      });

      expect(result).toEqual({
        type: 'failure',
        failure: {
          type: 'edit_panels',
          identifier: 'panel-1',
          failureId: 'failure-4',
          failureKind: 'visualization_generation',
          error: 'Pinned Vega query failed to execute',
        },
      });
    });
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
