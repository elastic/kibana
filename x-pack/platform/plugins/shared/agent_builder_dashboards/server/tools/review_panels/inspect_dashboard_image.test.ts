/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inspectDashboardImage } from './inspect_dashboard_image';

describe('inspectDashboardImage', () => {
  it('sends the screenshot and panel catalog to a structured vision call', async () => {
    const invoke = jest.fn().mockResolvedValue({
      findings: [
        {
          panel_id: 'lens-1',
          rule: 'disproportionate_size',
          what: 'metric is stretched full width',
          fix: '{ x: 0, y: 0, w: 12, h: 5 }',
        },
        {
          panel_id: 'lens-2',
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
      panels: [
        {
          id: 'lens-1',
          type: 'lens',
          title: 'Error rate',
          chart_type: 'metric',
          esql: 'FROM logs | STATS count = COUNT(*)',
          grid: { x: 0, y: 0, w: 24, h: 12 },
        },
      ],
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
    expect(textPart.text).toContain('disproportionate_size');
    expect(textPart.text).toContain('wrong_chart_type');
    expect(textPart.text).toContain('Kibana chrome');
    expect(textPart.text).toContain('title-only edits rebuild the chart');
    expect(textPart.text).toContain('data table');
    expect(textPart.text).toContain('Never shrink');
    expect(textPart.text).toContain('catalog is what each panel is');
    expect(textPart.text).toContain('PNG is how it looks');
    expect(textPart.text).toContain('FROM logs | STATS count = COUNT(*)');

    expect(findings).toEqual([
      {
        panel_id: 'lens-1',
        rule: 'disproportionate_size',
        what: 'metric is stretched full width',
        fix: '{ x: 0, y: 0, w: 12, h: 5 }',
      },
    ]);
  });

  it('drops size findings that would shrink a data table', async () => {
    const invoke = jest.fn().mockResolvedValue({
      findings: [
        {
          panel_id: 'table-1',
          rule: 'disproportionate_size',
          what: 'table is unnecessarily full-width',
          fix: '{ x: 0, y: 60, w: 24, h: 19 }',
        },
      ],
    });
    const modelProvider = {
      selectModel: jest.fn().mockResolvedValue({
        chatModel: { withStructuredOutput: jest.fn().mockReturnValue({ invoke }) },
      }),
    };

    const findings = await inspectDashboardImage({
      panels: [
        {
          id: 'table-1',
          type: 'lens',
          title: 'Errors by host',
          chart_type: 'data_table',
          grid: { x: 0, y: 60, w: 48, h: 19 },
        },
      ],
      image: { bytes: Buffer.from('png'), mimeType: 'image/png' },
      modelProvider: modelProvider as never,
    });

    expect(findings).toEqual([]);
  });
});
