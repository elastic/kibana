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
      findings: [{ panel_id: 'lens-1', rule: 'duplicate title', what: 'title repeats the metric' }],
    });
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    const modelProvider = {
      selectModel: jest.fn().mockResolvedValue({
        chatModel: { withStructuredOutput },
      }),
    };

    const findings = await inspectDashboardImage({
      panels: [
        { id: 'lens-1', type: 'lens', title: 'Error rate', grid: { x: 0, y: 0, w: 24, h: 12 } },
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
    expect(findings).toEqual([
      { panel_id: 'lens-1', rule: 'duplicate title', what: 'title repeats the metric' },
    ]);
  });
});
