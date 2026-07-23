/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ToolResultType, SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { VISUALIZATION_ATTACHMENT_TYPE } from '@kbn/agent-builder-visualizations-common';
import { buildLensConfig, buildVegaConfig } from '@kbn/agent-builder-visualizations-server';
import { createVisualizationTool } from './create_visualization';

jest.mock('@kbn/agent-builder-visualizations-server', () => ({
  buildLensConfig: jest.fn(),
  buildVegaConfig: jest.fn(),
}));

const mockBuildLens = buildLensConfig as jest.Mock;
const mockBuildVega = buildVegaConfig as jest.Mock;

const createLogger = (): Logger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

interface MockAttachments {
  getAttachmentRecord: jest.Mock;
  add: jest.Mock;
  update: jest.Mock;
}

const createAttachments = (): MockAttachments => ({
  getAttachmentRecord: jest.fn().mockReturnValue(undefined),
  add: jest.fn().mockResolvedValue({ id: 'att-new', current_version: 1 }),
  update: jest.fn().mockResolvedValue({ current_version: 2 }),
});

const runHandler = async (
  params: Record<string, unknown>,
  overrides: { logger?: Logger; attachments?: MockAttachments } = {}
) => {
  const logger = overrides.logger ?? createLogger();
  const attachments = overrides.attachments ?? createAttachments();
  const tool = createVisualizationTool();
  const result = (await tool.handler(
    params as never,
    {
      esClient: {} as never,
      modelProvider: {} as never,
      logger,
      events: {} as never,
      attachments: attachments as never,
    } as never
  )) as { results: Array<{ type: string; data: any }> };
  return { result, logger, attachments };
};

describe('createVisualizationTool handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildLens.mockResolvedValue({
      selectedChartType: SupportedChartType.XY,
      validatedConfig: { title: 'Errors over time' },
      esqlQuery: 'FROM logs | STATS count() BY @timestamp',
      timeRange: { from: 'now-15m', to: 'now' },
    });
    mockBuildVega.mockResolvedValue({
      spec: '{"$schema":"vega-lite"}',
      esqlQuery: 'FROM logs | STATS count() BY host',
    });
  });

  it('builds a Lens visualization by default and persists it', async () => {
    const { result, attachments } = await runHandler({ query: 'errors over time' });

    expect(mockBuildLens).toHaveBeenCalledTimes(1);
    expect(mockBuildVega).not.toHaveBeenCalled();
    expect(attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: VISUALIZATION_ATTACHMENT_TYPE })
    );

    expect(result.results).toHaveLength(1);
    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.visualization);
    expect(data.renderer).toBe('lens');
    expect(data.visualization).toEqual({ title: 'Errors over time' });
    expect(data.chart_type).toBe(SupportedChartType.XY);
    expect(data.esql).toBe('FROM logs | STATS count() BY @timestamp');
    expect(data.time_range).toEqual({ from: 'now-15m', to: 'now' });
    expect(data.attachment_id).toBe('att-new');
    expect(data.version).toBe(1);
    // The natural-language query is not echoed back in the result.
    expect(data.query).toBeUndefined();
  });

  it('builds a Vega visualization when the renderer is "vega"', async () => {
    const { result } = await runHandler({ query: 'flows by host', renderer: 'vega' });

    expect(mockBuildVega).toHaveBeenCalledTimes(1);
    expect(mockBuildLens).not.toHaveBeenCalled();

    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.visualization);
    expect(data.renderer).toBe('vega');
    expect(data.visualization).toEqual({ spec: '{"$schema":"vega-lite"}' });
    expect(data.esql).toBe('FROM logs | STATS count() BY host');
    expect(data.chart_type).toBeUndefined();
    expect(data.query).toBeUndefined();
  });

  it('keeps the existing renderer when updating by attachment id', async () => {
    const attachments = createAttachments();
    attachments.getAttachmentRecord.mockReturnValue({
      id: 'existing',
      type: VISUALIZATION_ATTACHMENT_TYPE,
      current_version: 1,
      versions: [
        {
          version: 1,
          data: {
            renderer: 'vega',
            query: 'old query',
            visualization: { spec: '{"old":true}' },
            esql: 'FROM old',
          },
        },
      ],
    });

    // Caller asks for lens, but an edit must preserve the existing vega renderer.
    const { result } = await runHandler(
      { query: 'tweak it', renderer: 'lens', attachment_id: 'existing' },
      { attachments }
    );

    expect(mockBuildVega).toHaveBeenCalledTimes(1);
    expect(mockBuildLens).not.toHaveBeenCalled();
    // The prior spec is reused as the edit baseline.
    expect(mockBuildVega).toHaveBeenCalledWith(
      expect.objectContaining({ existingSpec: '{"old":true}' })
    );
    expect(attachments.update).toHaveBeenCalledWith(
      'existing',
      expect.objectContaining({ data: expect.objectContaining({ renderer: 'vega' }) })
    );
    expect(attachments.add).not.toHaveBeenCalled();

    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.visualization);
    expect(data.renderer).toBe('vega');
    expect(data.attachment_id).toBe('existing');
    expect(data.version).toBe(2);
  });

  it('surfaces an error result when persistence fails instead of silently succeeding', async () => {
    const attachments = createAttachments();
    attachments.add.mockRejectedValue(new Error('index_not_found'));

    const { result, logger } = await runHandler({ query: 'errors over time' }, { attachments });

    expect(result.results).toHaveLength(1);
    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.error);
    expect(data.message).toContain('index_not_found');
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns an error result when spec generation throws', async () => {
    mockBuildLens.mockRejectedValue(new Error('esql_generation_failed'));

    const { result } = await runHandler({ query: 'broken' });

    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.error);
    expect(data.message).toContain('esql_generation_failed');
  });

  it('gives an actionable hint when index auto-discovery fails and no index was passed', async () => {
    // The deeply-nested error surfaced when the referenced fields are ungrounded.
    mockBuildLens.mockRejectedValue(
      new Error(
        'Failed to generate a valid Vega specification. Last error: Could not resolve a valid ' +
          'ES|QL query for the visualization: Could not generate ESQL query: Could not discover a ' +
          'suitable index for the query. Please specify an index explicitly.'
      )
    );

    const { result } = await runHandler({ query: 'cpu by host' });

    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.error);
    expect(data.message).toContain('Could not find an index matching the requested fields');
    expect(data.message).toContain('retry create_visualization with an explicit "index"');
  });

  it('does not add the index hint when an explicit index was provided', async () => {
    mockBuildLens.mockRejectedValue(
      new Error('Could not discover a suitable index for the query.')
    );

    const { result } = await runHandler({ query: 'cpu by host', index: 'metrics-*' });

    const [{ data }] = result.results;
    expect(data.message).toContain('Failed to create visualization:');
    expect(data.message).not.toContain('Could not find an index matching');
  });
});
