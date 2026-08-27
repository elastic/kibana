/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { getDashboardReviewPayloadSizes, inspectDashboardImage } from './inspect_dashboard_image';

const fatDashboard: DashboardAttachmentData = {
  title: 'Metrics',
  description: 'Latency and errors',
  time_range: { from: 'now-24h', to: 'now', mode: 'relative' },
  panels: [
    {
      type: LENS_EMBEDDABLE_TYPE,
      id: 'lens-1',
      grid: { x: 0, y: 0, w: 24, h: 12 },
      config: {
        title: 'Error rate',
        type: 'metric',
        hide_panel_titles: false,
        data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*)' },
        metrics: [
          {
            type: 'primary',
            column: 'count',
            color: { type: 'static', color: '#F5C518' },
            apply_color_to: 'background',
            format: { id: 'percent', params: { decimals: 1 } },
          },
        ],
        sampling: 1,
        legend: { isVisible: false },
      },
    },
    {
      type: LENS_EMBEDDABLE_TYPE,
      id: 'lens-2',
      grid: { x: 24, y: 0, w: 12, h: 12 },
      config: {
        title: 'Latency',
        type: 'xy',
        data_source: {
          type: 'esql',
          query: 'FROM logs | STATS p99 = PERCENTILE(latency, 99) BY @timestamp',
        },
        layers: [
          {
            type: 'series',
            seriesType: 'line',
            xAccessor: '@timestamp',
            accessors: ['p99'],
          },
        ],
        legend: { isVisible: true, position: 'right' },
        fittingFunction: 'Linear',
      },
    },
  ],
  pinned_panels: [
    {
      id: 'c1',
      type: 'options_list_control',
      config: { title: 'Host', fieldName: 'host.name', dataViewId: 'logs-*' },
    },
  ],
};

describe('inspectDashboardImage', () => {
  it('sends the screenshot and full dashboard attachment to a structured vision call', async () => {
    const invoke = jest.fn().mockResolvedValue({
      findings: [
        {
          rule: 'pack_layout',
          what: 'gap beside the metric',
          fix: {
            panels: [
              { panel_id: 'lens-1', grid: { x: 0, y: 0, w: 24, h: 12 } },
              { panel_id: 'lens-2', grid: { x: 24, y: 0, w: 24, h: 12 } },
            ],
          },
        },
        {
          rule: 'duplicate_title',
          what: 'title repeats the metric',
          fix: 'remove the title',
        },
      ],
    });
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    const modelProvider = {
      selectModel: jest.fn().mockResolvedValue({
        chatModel: { withStructuredOutput },
      }),
    };

    const findings = await inspectDashboardImage({
      dashboard: fatDashboard,
      image: { bytes: Buffer.from('png'), mimeType: 'image/png' },
      modelProvider: modelProvider as never,
    });

    expect(withStructuredOutput).toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({ type: 'text' }),
            expect.objectContaining({ type: 'image_url' }),
          ]),
        }),
      ])
    );

    const textPart = invoke.mock.calls[0][0][0].content.find(
      (part: { type: string }) => part.type === 'text'
    );
    expect(textPart.text).toContain('When in doubt, omit');
    expect(textPart.text).toContain('pack_layout');
    expect(textPart.text).toContain('weak_sections');
    expect(textPart.text).toContain('monotone_chart_types');
    expect(textPart.text).toContain('wrong_chart_type');
    expect(textPart.text).toContain('weak_controls');
    expect(textPart.text).toContain('duplicate_inner_title');
    expect(textPart.text).toContain('one_category_chart');
    expect(textPart.text).toContain('metric_fill');
    expect(textPart.text).toContain('thin_metric');
    expect(textPart.text).not.toContain('disproportionate_size');
    expect(textPart.text).toContain('Kibana chrome');
    expect(textPart.text).toContain('Title-only edit_panels rebuilds the chart');
    expect(textPart.text).toContain('data table');
    expect(textPart.text).toContain('Never shrink');
    expect(textPart.text).toContain('stretched KPIs');
    expect(textPart.text).toContain('Dashboard attachment:');
    expect(textPart.text).not.toContain('Dashboard catalog:');
    expect(textPart.text).toContain('full dashboard attachment');
    expect(textPart.text).toContain('Infer each finding');
    expect(textPart.text).toContain('FROM logs | STATS count = COUNT(*)');
    expect(textPart.text).toContain('fittingFunction');
    expect(textPart.text).toContain('Dashboard Composition Guidelines');
    expect(textPart.text).toContain('Grid Packing Rules');
    expect(textPart.text).toContain('Available chart types');
    expect(textPart.text).toContain('options_list_control');
    expect(textPart.text).toContain('"id":"c1"');

    expect(findings).toEqual([
      {
        rule: 'pack_layout',
        what: 'gap beside the metric',
        fix: {
          panels: [
            { panel_id: 'lens-1', grid: { x: 0, y: 0, w: 24, h: 12 } },
            { panel_id: 'lens-2', grid: { x: 24, y: 0, w: 24, h: 12 } },
          ],
        },
      },
    ]);
  });

  it('measures how much larger the attachment JSON is than the compact catalog', () => {
    expect(getDashboardReviewPayloadSizes(fatDashboard)).toEqual({
      catalogBytes: 449,
      attachmentBytes: 1061,
    });
  });

  it('drops an incomplete pack_layout and keeps invert findings', async () => {
    const invoke = jest.fn().mockResolvedValue({
      findings: [
        {
          rule: 'pack_layout',
          what: 'resize one panel',
          fix: {
            panels: [{ panel_id: 'table-1', grid: { x: 0, y: 60, w: 24, h: 19 } }],
          },
        },
        {
          rule: 'wrong_chart_type',
          panel_id: 'lens-1',
          what: 'pie for a time series',
          fix: { chartType: 'xy' },
        },
      ],
    });
    const modelProvider = {
      selectModel: jest.fn().mockResolvedValue({
        chatModel: { withStructuredOutput: jest.fn().mockReturnValue({ invoke }) },
      }),
    };

    const findings = await inspectDashboardImage({
      dashboard: {
        title: 'Errors',
        panels: [
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'table-1',
            grid: { x: 0, y: 60, w: 48, h: 19 },
            config: { title: 'Errors by host', type: 'data_table' },
          },
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'lens-1',
            grid: { x: 0, y: 0, w: 24, h: 12 },
            config: { title: 'Errors over time', type: 'pie' },
          },
        ],
      },
      image: { bytes: Buffer.from('png'), mimeType: 'image/png' },
      modelProvider: modelProvider as never,
    });

    expect(findings).toEqual([
      {
        rule: 'wrong_chart_type',
        panel_id: 'lens-1',
        what: 'pie for a time series',
        fix: { chartType: 'xy' },
      },
    ]);
  });
});
