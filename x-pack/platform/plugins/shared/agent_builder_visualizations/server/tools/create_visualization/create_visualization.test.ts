/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ToolResultType, SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  DEFAULT_TIME_RANGE,
  VISUALIZATION_ATTACHMENT_TYPE,
} from '@kbn/agent-builder-visualizations-common';
import {
  buildLensConfig,
  buildVegaConfig,
  generateVisualizationEsql,
  selectDefaultTimeRange,
} from '@kbn/agent-builder-visualizations-server';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import { createVisualizationTool } from './create_visualization';

jest.mock('@kbn/agent-builder-visualizations-server', () => ({
  buildLensConfig: jest.fn(),
  buildVegaConfig: jest.fn(),
  generateVisualizationEsql: jest.fn(),
  selectDefaultTimeRange: jest.fn(),
}));

jest.mock('@kbn/custom-content-server', () => ({
  createCustomContentTemplateResolver: jest.fn(),
}));

const mockBuildLens = buildLensConfig as jest.Mock;
const mockBuildVega = buildVegaConfig as jest.Mock;
const mockSelectDefaultTimeRange = selectDefaultTimeRange as jest.Mock;
const mockGenerateEsql = generateVisualizationEsql as jest.Mock;
const mockCreateTemplateResolver = createCustomContentTemplateResolver as jest.Mock;
const mockResolveTemplate = jest.fn();

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

const lensTarget = (chartType: SupportedChartType = SupportedChartType.XY) => ({
  type: 'lens' as const,
  chartType,
});
const vegaTarget = { type: 'vega' as const };
const customContentTarget = (rest: { esql?: string | null; has_data?: boolean | null } = {}) => ({
  type: 'custom_content' as const,
  ...rest,
});
const attachmentTarget = (
  attachmentId: string,
  rest: {
    chartType?: SupportedChartType;
    esql?: string | null;
    has_data?: boolean | null;
  } = {}
) => ({ type: 'attachment' as const, attachment_id: attachmentId, ...rest });

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

describe('createVisualizationTool schema', () => {
  const schema = createVisualizationTool().schema;

  it('requires a target', () => {
    expect(schema.safeParse({ query: 'errors over time' }).success).toBe(false);
    expect(
      schema.safeParse({ query: 'errors over time', target: { type: 'unknown' } }).success
    ).toBe(false);
  });

  it('requires chartType for a new Lens visualization', () => {
    expect(schema.safeParse({ query: 'errors over time', target: lensTarget() }).success).toBe(
      true
    );

    expect(schema.safeParse({ query: 'errors over time', target: { type: 'lens' } }).success).toBe(
      false
    );
  });

  it('allows a new Vega visualization without chartType', () => {
    expect(schema.safeParse({ query: 'small multiples by host', target: vegaTarget }).success).toBe(
      true
    );
  });

  it('allows a new custom content visualization without chartType', () => {
    expect(
      schema.safeParse({ query: 'a status board per host', target: customContentTarget() }).success
    ).toBe(true);
  });

  it('accepts leftover esql: null on every target and treats it as omitted', () => {
    const lens = schema.safeParse({
      query: 'errors over time',
      target: { ...lensTarget(), esql: null },
    });
    expect(lens.success).toBe(true);
    if (lens.success) {
      expect(lens.data.target).toMatchObject({ type: 'lens', esql: null });
    }

    expect(
      schema.safeParse({ query: 'flows by host', target: { ...vegaTarget, esql: null } }).success
    ).toBe(true);
    expect(
      schema.safeParse({
        query: 'a status board per host',
        target: customContentTarget({ esql: null }),
      }).success
    ).toBe(true);
  });

  it('accepts has_data only on custom_content and attachment targets', () => {
    expect(
      schema.safeParse({
        query: 'a welcome banner',
        target: customContentTarget({ has_data: false }),
      }).success
    ).toBe(true);
    expect(
      schema.safeParse({
        query: 'drop the data',
        target: attachmentTarget('existing', { has_data: false }),
      }).success
    ).toBe(true);

    const lens = schema.safeParse({
      query: 'errors over time',
      target: { ...lensTarget(), has_data: false },
    });
    expect(lens.success).toBe(true);
    if (lens.success) {
      expect(lens.data.target).not.toHaveProperty('has_data');
    }
  });

  it('strips leftover contentMode instead of failing the call', () => {
    const lens = schema.safeParse({
      query: 'errors over time',
      target: { ...lensTarget(), contentMode: 'static' },
    });
    expect(lens.success).toBe(true);
    if (lens.success) {
      expect(lens.data.target).not.toHaveProperty('contentMode');
    }
  });

  it('allows an attachment update without chartType and requires the attachment id', () => {
    expect(
      schema.safeParse({ query: 'use a clearer title', target: attachmentTarget('existing') })
        .success
    ).toBe(true);
    expect(
      schema.safeParse({ query: 'use a clearer title', target: { type: 'attachment' } }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        query: 'use a clearer title',
        target: { type: 'attachment', attachment_id: '' },
      }).success
    ).toBe(false);
  });

  it('accepts an optional time_range', () => {
    expect(schema.safeParse({ query: 'errors over time', target: lensTarget() }).success).toBe(
      true
    );

    expect(
      schema.safeParse({
        query: 'errors over time',
        target: lensTarget(),
        time_range: { from: 'now-7d', to: 'now' },
      }).success
    ).toBe(true);
  });

  it('fills a blank time_range endpoint with now-24h / now instead of failing', () => {
    const base = { query: 'errors over time', target: lensTarget() };

    const missingTo = schema.safeParse({ ...base, time_range: { from: 'now-7d' } });
    expect(missingTo.success).toBe(true);
    if (missingTo.success) {
      expect(missingTo.data.time_range).toEqual({ from: 'now-7d', to: DEFAULT_TIME_RANGE.to });
    }

    const to = new Date().toISOString();
    const blankFrom = schema.safeParse({
      ...base,
      time_range: { from: '', to },
    });
    expect(blankFrom.success).toBe(true);
    if (blankFrom.success) {
      expect(blankFrom.data.time_range).toEqual({ from: DEFAULT_TIME_RANGE.from, to });
    }

    const blankTo = schema.safeParse({ ...base, time_range: { from: 'now-7d', to: '' } });
    expect(blankTo.success).toBe(true);
    if (blankTo.success) {
      expect(blankTo.data.time_range).toEqual({ from: 'now-7d', to: DEFAULT_TIME_RANGE.to });
    }
  });

  it('rejects a time_range whose endpoints are not valid Kibana date math', () => {
    const base = { query: 'errors over time', target: lensTarget() };

    expect(schema.safeParse({ ...base, time_range: { from: '', to: '' } }).success).toBe(true);
    expect(schema.safeParse({ ...base, time_range: { from: '', to: '' } }).data?.time_range).toBe(
      undefined
    );
    expect(schema.safeParse({ ...base, time_range: { from: '', to: 'not-a-date' } }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...base, time_range: { from: 'yesterday', to: 'today' } }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...base,
        time_range: { from: '2026-01-02T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' },
      }).success
    ).toBe(false);

    expect(schema.safeParse({ ...base, time_range: { from: 'now-7d', to: 'now' } }).success).toBe(
      true
    );
    expect(
      schema.safeParse({
        ...base,
        time_range: { from: '2024-05-20T00:00:00.000Z', to: '2024-05-24T23:59:59.999Z' },
      }).success
    ).toBe(true);
  });
});

describe('createVisualizationTool handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildLens.mockResolvedValue({
      selectedChartType: SupportedChartType.XY,
      validatedConfig: { title: 'Errors over time' },
      esqlQuery: 'FROM logs | STATS count() BY @timestamp',
    });
    mockBuildVega.mockResolvedValue({
      spec: '{"$schema":"vega-lite"}',
      esqlQuery: 'FROM logs | STATS count() BY host',
    });
    mockSelectDefaultTimeRange.mockResolvedValue({
      from: 'now-15m',
      to: 'now',
      mode: 'relative',
    });
    mockGenerateEsql.mockResolvedValue({ query: 'FROM logs | STATS count() BY host' });
    mockResolveTemplate.mockResolvedValue({
      template: '<div>{{ row["host"].value }}</div>',
      height: 420,
    });
    mockCreateTemplateResolver.mockReturnValue(mockResolveTemplate);
  });

  it('builds a Lens visualization and persists it', async () => {
    const { result, attachments } = await runHandler({
      query: 'errors over time',
      target: lensTarget(),
    });

    expect(mockBuildLens).toHaveBeenCalledTimes(1);
    expect(mockBuildLens).toHaveBeenCalledWith(
      expect.objectContaining({ chartType: SupportedChartType.XY, esql: undefined })
    );
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

  it('passes a supplied esql through to the Lens builder', async () => {
    await runHandler({
      query: 'errors over time',
      target: { ...lensTarget(), esql: 'FROM logs | STATS count() BY @timestamp' },
    });

    expect(mockBuildLens).toHaveBeenCalledWith(
      expect.objectContaining({ esql: 'FROM logs | STATS count() BY @timestamp' })
    );
  });

  it('builds a Vega visualization when the target type is "vega"', async () => {
    const { result } = await runHandler({ query: 'flows by host', target: vegaTarget });

    expect(mockBuildVega).toHaveBeenCalledTimes(1);
    expect(mockBuildLens).not.toHaveBeenCalled();

    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.visualization);
    expect(data.renderer).toBe('vega');
    expect(data.visualization).toEqual({ spec: '{"$schema":"vega-lite"}' });
    expect(data.esql).toBe('FROM logs | STATS count() BY host');
    expect(data.chart_type).toBeUndefined();
    expect(data.time_range).toEqual({ from: 'now-15m', to: 'now' });
    expect(data.query).toBeUndefined();
  });

  it('omits time_range when selectDefaultTimeRange returns undefined', async () => {
    mockSelectDefaultTimeRange.mockResolvedValue(undefined);

    const { result, attachments } = await runHandler({
      query: 'errors over time',
      target: lensTarget(),
    });

    expect(result.results[0].data.time_range).toBeUndefined();
    expect(attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ time_range: expect.anything() }),
      })
    );
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

    const { result } = await runHandler(
      { query: 'tweak it', target: attachmentTarget('existing') },
      { attachments }
    );

    expect(mockBuildVega).toHaveBeenCalledTimes(1);
    expect(mockBuildLens).not.toHaveBeenCalled();
    // The prior spec is reused as the edit baseline.
    expect(mockBuildVega).toHaveBeenCalledWith(
      expect.objectContaining({ existingSpec: '{"old":true}' })
    );
    expect(mockSelectDefaultTimeRange).not.toHaveBeenCalled();
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
    expect(data.time_range).toBeUndefined();
  });

  it('treats an attachment with no renderer as Lens when updating', async () => {
    const attachments = createAttachments();
    attachments.getAttachmentRecord.mockReturnValue({
      id: 'legacy',
      type: VISUALIZATION_ATTACHMENT_TYPE,
      current_version: 1,
      versions: [
        {
          version: 1,
          data: {
            query: 'old query',
            visualization: { type: 'lnsXY' },
            esql: 'FROM old',
          },
        },
      ],
    });

    const { result } = await runHandler(
      { query: 'tweak it', target: attachmentTarget('legacy') },
      { attachments }
    );

    expect(mockBuildLens).toHaveBeenCalledTimes(1);
    expect(mockBuildVega).not.toHaveBeenCalled();
    // The prior config is handed to the Lens builder rather than discarded.
    expect(mockBuildLens).toHaveBeenCalledWith(
      expect.objectContaining({ parsedExistingConfig: { type: 'lnsXY' } })
    );

    const [{ data }] = result.results;
    expect(data.renderer).toBe('lens');
  });

  it('treats leftover esql: null on Lens as omitted so the chart still builds', async () => {
    await runHandler({
      query: 'errors over time',
      target: { ...lensTarget(), esql: null },
    });

    expect(mockBuildLens).toHaveBeenCalledWith(expect.objectContaining({ esql: undefined }));
  });

  it('ignores has_data: false on a Lens update instead of failing the chart', async () => {
    const attachments = createAttachments();
    attachments.getAttachmentRecord.mockReturnValue({
      id: 'existing',
      type: VISUALIZATION_ATTACHMENT_TYPE,
      current_version: 1,
      versions: [
        {
          version: 1,
          data: {
            renderer: 'lens',
            query: 'errors over time',
            visualization: { title: 'Errors' },
            esql: 'FROM logs | STATS count() BY @timestamp',
          },
        },
      ],
    });

    const { result } = await runHandler(
      { query: 'drop the data', target: attachmentTarget('existing', { has_data: false }) },
      { attachments }
    );

    expect(result.results[0].type).toBe(ToolResultType.visualization);
    expect(mockBuildLens).toHaveBeenCalledTimes(1);
    expect(attachments.update).toHaveBeenCalled();
  });

  it('reuses the existing time_range on edit instead of probing', async () => {
    const attachments = createAttachments();
    attachments.getAttachmentRecord.mockReturnValue({
      id: 'existing',
      type: VISUALIZATION_ATTACHMENT_TYPE,
      current_version: 1,
      versions: [
        {
          version: 1,
          data: {
            renderer: 'lens',
            query: 'errors over time',
            visualization: { title: 'Errors' },
            esql: 'FROM logs | STATS count() BY @timestamp',
            time_range: { from: 'now-7d', to: 'now' },
          },
        },
      ],
    });

    const { result } = await runHandler(
      { query: 'make it a line chart', target: attachmentTarget('existing') },
      { attachments }
    );

    expect(mockSelectDefaultTimeRange).not.toHaveBeenCalled();
    expect(attachments.update).toHaveBeenCalledWith(
      'existing',
      expect.objectContaining({
        data: expect.objectContaining({ time_range: { from: 'now-7d', to: 'now' } }),
      })
    );
    expect(result.results[0].data.time_range).toEqual({ from: 'now-7d', to: 'now' });
  });

  it('uses an explicit time_range on create and skips the data-aware probe', async () => {
    const { result, attachments } = await runHandler({
      query: 'errors over the last 7 days',
      target: lensTarget(),
      time_range: { from: 'now-7d', to: 'now' },
    });

    expect(mockSelectDefaultTimeRange).not.toHaveBeenCalled();
    expect(result.results[0].data.time_range).toEqual({ from: 'now-7d', to: 'now' });
    expect(attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ time_range: { from: 'now-7d', to: 'now' } }),
      })
    );
  });

  it('fills a blank time_range.from and persists that range instead of probing', async () => {
    const to = new Date().toISOString();
    const schema = createVisualizationTool().schema;
    const parsed = schema.parse({
      query: 'count of requests by response.keyword',
      index: 'kibana_sample_data_logs',
      target: lensTarget(),
      time_range: { from: '', to },
    });

    const { result, attachments } = await runHandler(parsed);

    expect(mockSelectDefaultTimeRange).not.toHaveBeenCalled();
    expect(result.results[0].data.time_range).toEqual({ from: DEFAULT_TIME_RANGE.from, to });
    expect(attachments.add).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ time_range: { from: DEFAULT_TIME_RANGE.from, to } }),
      })
    );
  });

  it('uses an explicit time_range on edit instead of the stored range', async () => {
    const attachments = createAttachments();
    attachments.getAttachmentRecord.mockReturnValue({
      id: 'existing',
      type: VISUALIZATION_ATTACHMENT_TYPE,
      current_version: 1,
      versions: [
        {
          version: 1,
          data: {
            renderer: 'lens',
            query: 'errors over time',
            visualization: { title: 'Errors' },
            esql: 'FROM logs | STATS count() BY @timestamp',
            time_range: { from: 'now-24h', to: 'now' },
          },
        },
      ],
    });

    const { result } = await runHandler(
      {
        query: 'show the last 30 days',
        target: attachmentTarget('existing'),
        time_range: { from: 'now-30d', to: 'now' },
      },
      { attachments }
    );

    expect(mockSelectDefaultTimeRange).not.toHaveBeenCalled();
    expect(result.results[0].data.time_range).toEqual({ from: 'now-30d', to: 'now' });
    expect(attachments.update).toHaveBeenCalledWith(
      'existing',
      expect.objectContaining({
        data: expect.objectContaining({ time_range: { from: 'now-30d', to: 'now' } }),
      })
    );
  });

  it('returns an error when the attachment to update does not exist', async () => {
    const { result, attachments } = await runHandler({
      query: 'tweak it',
      target: attachmentTarget('missing'),
    });

    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.error);
    expect(data.message).toContain('Visualization attachment "missing" not found');
    expect(mockBuildLens).not.toHaveBeenCalled();
    expect(mockBuildVega).not.toHaveBeenCalled();
    expect(attachments.add).not.toHaveBeenCalled();
    expect(attachments.update).not.toHaveBeenCalled();
  });

  it('surfaces an error result when persistence fails instead of silently succeeding', async () => {
    const attachments = createAttachments();
    attachments.add.mockRejectedValue(new Error('index_not_found'));

    const { result, logger } = await runHandler(
      { query: 'errors over time', target: lensTarget() },
      { attachments }
    );

    expect(result.results).toHaveLength(1);
    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.error);
    expect(data.message).toContain('index_not_found');
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns an error result when spec generation throws', async () => {
    mockBuildLens.mockRejectedValue(new Error('esql_generation_failed'));

    const { result } = await runHandler({
      query: 'broken',
      target: lensTarget(SupportedChartType.Metric),
    });

    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.error);
    expect(data.message).toContain('esql_generation_failed');
    expect(data.metadata).toEqual(
      expect.objectContaining({ renderer: 'lens', chartType: SupportedChartType.Metric })
    );
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

    const { result } = await runHandler({
      query: 'cpu by host',
      target: lensTarget(),
    });

    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.error);
    expect(data.message).toContain('Could not find an index matching the requested fields');
    expect(data.message).toContain('retry create_visualization with an explicit "index"');
  });

  it('does not add the index hint when an explicit index was provided', async () => {
    mockBuildLens.mockRejectedValue(
      new Error('Could not discover a suitable index for the query.')
    );

    const { result } = await runHandler({
      query: 'cpu by host',
      index: 'metrics-*',
      target: lensTarget(),
    });

    const [{ data }] = result.results;
    expect(data.message).toContain('Failed to create visualization:');
    expect(data.message).not.toContain('Could not find an index matching');
  });

  describe('custom content', () => {
    it('generates the template server-side and persists it under visualization.template', async () => {
      const { result, attachments } = await runHandler({
        query: 'a status board per host',
        target: customContentTarget({ esql: 'FROM logs | STATS count() BY host' }),
      });

      expect(mockBuildLens).not.toHaveBeenCalled();
      expect(mockBuildVega).not.toHaveBeenCalled();
      expect(mockGenerateEsql).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'a status board per host',
          esqlQuery: 'FROM logs | STATS count() BY host',
        })
      );

      expect(attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: VISUALIZATION_ATTACHMENT_TYPE,
          data: expect.objectContaining({
            renderer: 'custom_content',
            visualization: { template: '<div>{{ row["host"].value }}</div>', height: 420 },
            esql: 'FROM logs | STATS count() BY host',
          }),
        })
      );

      const [{ type, data }] = result.results;
      expect(type).toBe(ToolResultType.visualization);
      expect(data.renderer).toBe('custom_content');
      expect(data.attachment_id).toBe('att-new');
    });

    // The whole point of the custom content result shape: several KB of generated
    // markup must not be echoed back into the model's context.
    it('does not return the template in the tool result', async () => {
      const { result } = await runHandler({
        query: 'a status board per host',
        target: customContentTarget({ esql: 'FROM logs | STATS count() BY host' }),
      });

      const [{ data }] = result.results;
      expect(data.visualization).toEqual({ prompt: 'a status board per host' });
      expect(JSON.stringify(data)).not.toContain('row["host"]');
    });

    it('generates the ES|QL query for a new panel when esql is omitted', async () => {
      const { result } = await runHandler({
        query: 'a status board per host',
        index: 'logs-*',
        target: customContentTarget(),
      });

      expect(mockGenerateEsql).toHaveBeenCalledWith(
        expect.objectContaining({ nlQuery: 'a status board per host', index: 'logs-*' })
      );
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: 'FROM logs | STATS count() BY host' })
      );

      const [{ data }] = result.results;
      expect(data.esql).toBe('FROM logs | STATS count() BY host');
    });

    // Data-free is a request, not what you get when a query cannot be generated.
    it('fails rather than falling back to a data-free panel when query generation fails', async () => {
      mockGenerateEsql.mockResolvedValue({ error: 'no suitable index' });

      const { result } = await runHandler({
        query: 'a status board per host',
        target: customContentTarget(),
      });

      const [{ type, data }] = result.results;
      expect(type).toBe(ToolResultType.error);
      expect(data.message).toContain('Could not generate an ES|QL query');
      expect(mockResolveTemplate).not.toHaveBeenCalled();
    });

    it('generates a query when leftover esql: null means the agent has none in hand', async () => {
      const { result } = await runHandler({
        query: 'document count per minute over time as a line chart',
        index: 'kibana_sample_data_logs',
        target: customContentTarget({ esql: null }),
      });

      expect(mockGenerateEsql).toHaveBeenCalledTimes(1);
      expect(result.results[0].data.esql).toBe('FROM logs | STATS count() BY host');
    });

    it('persists a data-free panel with no esql when has_data is false', async () => {
      const { result, attachments } = await runHandler({
        query: 'a welcome banner',
        target: customContentTarget({ has_data: false }),
      });

      expect(mockGenerateEsql).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'a welcome banner', esqlQuery: undefined })
      );
      expect(attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ esql: expect.anything() }),
        })
      );

      const [{ data }] = result.results;
      expect(data.esql).toBeUndefined();
    });

    // A supplied query is the strongest signal that the panel has data, so it wins
    // over a has_data: false passed alongside it.
    it('keeps the supplied esql when has_data: false is passed together with it', async () => {
      const { result, attachments } = await runHandler({
        query: 'a status board per host',
        target: customContentTarget({
          esql: 'FROM logs | STATS count() BY host',
          has_data: false,
        }),
      });

      expect(mockGenerateEsql).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: 'FROM logs | STATS count() BY host' })
      );
      expect(attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ esql: 'FROM logs | STATS count() BY host' }),
        })
      );
      expect(result.results[0].data.esql).toBe('FROM logs | STATS count() BY host');
    });

    it('treats an empty esql as omitted and generates a query', async () => {
      const { result } = await runHandler({
        query: 'a status board per host',
        index: 'logs-*',
        target: customContentTarget({ esql: '' }),
      });

      expect(mockGenerateEsql).toHaveBeenCalledTimes(1);
      expect(result.results[0].data.esql).toBe('FROM logs | STATS count() BY host');
    });

    const dataAttachment = () => {
      const attachments = createAttachments();
      attachments.getAttachmentRecord.mockReturnValue({
        id: 'att-1',
        current_version: 1,
        versions: [
          {
            version: 1,
            data: {
              renderer: 'custom_content',
              query: 'a status board per host',
              visualization: { template: '<div>old</div>' },
              esql: 'FROM logs | STATS count() BY host',
            },
          },
        ],
      });
      return attachments;
    };

    it('keeps the custom content renderer and query when updating with esql omitted', async () => {
      const { result } = await runHandler(
        { query: 'use a darker background', target: attachmentTarget('att-1') },
        { attachments: dataAttachment() }
      );

      expect(mockBuildLens).not.toHaveBeenCalled();
      expect(mockGenerateEsql).not.toHaveBeenCalled();
      // A style-only edit refines the existing template rather than re-sampling the query.
      expect(mockResolveTemplate).toHaveBeenCalledWith({
        prompt: 'use a darker background',
        esqlQuery: undefined,
        existingTemplate: '<div>old</div>',
        hasExistingQuery: true,
      });

      const [{ data }] = result.results;
      expect(data.renderer).toBe('custom_content');
      expect(data.attachment_id).toBe('att-1');
      expect(data.esql).toBe('FROM logs | STATS count() BY host');
    });

    it('keeps a stored query when an update passes leftover esql: null', async () => {
      const { result } = await runHandler(
        { query: 'use a darker background', target: attachmentTarget('att-1', { esql: null }) },
        { attachments: dataAttachment() }
      );

      expect(mockGenerateEsql).not.toHaveBeenCalled();
      expect(result.results[0].data.esql).toBe('FROM logs | STATS count() BY host');
    });

    // A redundant has_data: true on a style-only edit must not regenerate a working
    // query from the styling prompt.
    it('keeps the stored query when an update passes has_data: true on a data-backed panel', async () => {
      const { result } = await runHandler(
        {
          query: 'use a darker background',
          target: attachmentTarget('att-1', { has_data: true }),
        },
        { attachments: dataAttachment() }
      );

      expect(mockGenerateEsql).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery: undefined, hasExistingQuery: true })
      );
      expect(result.results[0].data.esql).toBe('FROM logs | STATS count() BY host');
    });

    it('re-samples when an update supplies a different esql', async () => {
      const { result } = await runHandler(
        {
          query: 'show error counts instead',
          target: attachmentTarget('att-1', { esql: 'FROM logs | STATS errors = COUNT() BY host' }),
        },
        { attachments: dataAttachment() }
      );

      expect(mockGenerateEsql).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          esqlQuery: 'FROM logs | STATS errors = COUNT() BY host',
          existingTemplate: '<div>old</div>',
          hasExistingQuery: false,
        })
      );

      const [{ data }] = result.results;
      expect(data.esql).toBe('FROM logs | STATS errors = COUNT() BY host');
    });

    it('drops the query when an update passes has_data: false', async () => {
      const { result, attachments } = await runHandler(
        {
          query: 'turn this into a plain banner',
          target: attachmentTarget('att-1', { has_data: false }),
        },
        { attachments: dataAttachment() }
      );

      expect(mockGenerateEsql).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith({
        prompt: 'turn this into a plain banner',
        esqlQuery: undefined,
        existingTemplate: '<div>old</div>',
        hasExistingQuery: false,
      });
      expect(attachments.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          data: expect.not.objectContaining({ esql: expect.anything() }),
        })
      );

      const [{ data }] = result.results;
      expect(data.esql).toBeUndefined();
    });

    it('replaces the query when an update passes has_data: false together with an esql', async () => {
      const { result, attachments } = await runHandler(
        {
          query: 'show error counts instead',
          target: attachmentTarget('att-1', {
            esql: 'FROM logs | STATS errors = COUNT() BY host',
            has_data: false,
          }),
        },
        { attachments: dataAttachment() }
      );

      expect(mockGenerateEsql).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          esqlQuery: 'FROM logs | STATS errors = COUNT() BY host',
          hasExistingQuery: false,
        })
      );
      expect(attachments.update).toHaveBeenCalledWith(
        'att-1',
        expect.objectContaining({
          data: expect.objectContaining({ esql: 'FROM logs | STATS errors = COUNT() BY host' }),
        })
      );
      expect(result.results[0].data.esql).toBe('FROM logs | STATS errors = COUNT() BY host');
    });

    const dataFreeAttachment = () => {
      const attachments = createAttachments();
      attachments.getAttachmentRecord.mockReturnValue({
        id: 'banner',
        type: VISUALIZATION_ATTACHMENT_TYPE,
        current_version: 1,
        versions: [
          {
            version: 1,
            data: {
              renderer: 'custom_content',
              query: 'a welcome banner',
              visualization: { template: '<div>hi</div>' },
            },
          },
        ],
      });
      return attachments;
    };

    // A wording tweak to a data-free panel must neither invent a query nor fail.
    it('keeps a data-free panel data-free when updating with esql omitted', async () => {
      const { result } = await runHandler(
        { query: 'make the subtitle smaller', target: attachmentTarget('banner') },
        { attachments: dataFreeAttachment() }
      );

      expect(mockGenerateEsql).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith({
        prompt: 'make the subtitle smaller',
        esqlQuery: undefined,
        existingTemplate: '<div>hi</div>',
        hasExistingQuery: false,
      });

      const [{ type, data }] = result.results;
      expect(type).toBe(ToolResultType.visualization);
      expect(data.esql).toBeUndefined();
    });

    it('adds data to a data-free panel when an update supplies an esql', async () => {
      const { result } = await runHandler(
        {
          query: 'show the log count too',
          target: attachmentTarget('banner', { esql: 'FROM logs | STATS count() BY host' }),
        },
        { attachments: dataFreeAttachment() }
      );

      expect(mockGenerateEsql).not.toHaveBeenCalled();
      expect(mockResolveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          esqlQuery: 'FROM logs | STATS count() BY host',
          existingTemplate: '<div>hi</div>',
        })
      );

      const [{ data }] = result.results;
      expect(data.esql).toBe('FROM logs | STATS count() BY host');
    });

    it('generates a query when an update passes has_data: true on a data-free panel', async () => {
      const { result } = await runHandler(
        {
          query: 'show the log count too',
          target: attachmentTarget('banner', { has_data: true }),
        },
        { attachments: dataFreeAttachment() }
      );

      expect(mockGenerateEsql).toHaveBeenCalledTimes(1);
      expect(result.results[0].data.esql).toBe('FROM logs | STATS count() BY host');
    });

    it('reports a template generation failure as an error result', async () => {
      mockResolveTemplate.mockRejectedValue(new Error('ES|QL query is invalid'));

      const { result } = await runHandler({
        query: 'a status board per host',
        target: customContentTarget({ esql: 'FROM nope' }),
      });

      const [{ type, data }] = result.results;
      expect(type).toBe(ToolResultType.error);
      expect(data.message).toContain('ES|QL query is invalid');
    });
  });
});
