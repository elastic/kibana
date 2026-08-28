/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { planPrettifyOperations } from './plan_prettify_operations';

describe('planPrettifyOperations', () => {
  it('asks the inner model for generate operations from findings', async () => {
    const invoke = jest.fn().mockResolvedValue({
      operations: [
        {
          operation: 'update_panel_layouts',
          panels: [{ panelId: 'lens-1', grid: { x: 0, y: 0, w: 48, h: 10 } }],
        },
      ],
    });
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    const modelProvider = {
      selectModel: jest.fn().mockResolvedValue({
        chatModel: { withStructuredOutput },
      }),
    };

    const findings = [
      {
        rule: 'pack_layout' as const,
        what: 'gap beside the metric',
        fix: {
          panels: [{ panelId: 'lens-1', grid: { x: 0, y: 0, w: 48, h: 10 } }],
        },
      },
    ];

    const operations = await planPrettifyOperations({
      findings,
      modelProvider: modelProvider as never,
    });

    expect(withStructuredOutput).toHaveBeenCalled();
    const invoked = JSON.stringify(invoke.mock.calls[0][0]);
    expect(invoked).toContain('Prettify planner');
    expect(invoked).toContain('add_section');
    expect(invoked).toContain('update_panel_layouts');
    expect(invoked).toContain('edit_panels');
    expect(invoked).toContain('add_controls');
    expect(invoked).toContain('Do not add or remove visualization panels');
    expect(invoked).toContain('natural-language query');
    expect(invoked).not.toContain('clear_metric_fill');
    expect(invoked).not.toContain('metric_trendline');
    expect(invoked).toContain('pack_layout');
    expect(invoked).toContain('lens-1');

    expect(operations).toEqual([
      {
        operation: 'update_panel_layouts',
        panels: [{ panelId: 'lens-1', grid: { x: 0, y: 0, w: 48, h: 10 } }],
      },
    ]);
  });

  it('returns no operations when the model omits them', async () => {
    const invoke = jest.fn().mockResolvedValue({});
    const modelProvider = {
      selectModel: jest.fn().mockResolvedValue({
        chatModel: { withStructuredOutput: jest.fn().mockReturnValue({ invoke }) },
      }),
    };

    await expect(
      planPrettifyOperations({
        findings: [],
        modelProvider: modelProvider as never,
      })
    ).resolves.toEqual([]);
  });
});
