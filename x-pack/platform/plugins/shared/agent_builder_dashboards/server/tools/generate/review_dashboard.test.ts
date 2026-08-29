/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';
import { reviewDashboard } from './review_dashboard';
import type { DashboardSummary } from './summarize_dashboard';

const summary: DashboardSummary = {
  title: 'Logs',
  panels: [
    {
      type: 'lens',
      id: 'm1',
      grid: { x: 0, y: 0, w: 48, h: 5 },
      chart_type: 'metric',
    },
  ],
  controls: [],
};

describe('reviewDashboard', () => {
  it('returns structured problems from the judge and does not invent fixes', async () => {
    const invoke = jest.fn().mockResolvedValue({
      problems: [
        {
          topic: 'grid',
          severity: 'miss',
          detail: 'Metric m1 is full-width.',
          panel_id: 'm1',
        },
      ],
    });
    const modelProvider = {
      hasFastModel: jest.fn().mockResolvedValue(true),
      selectModel: jest.fn().mockResolvedValue({
        chatModel: { withStructuredOutput: jest.fn(() => ({ invoke })) },
      }),
      getDefaultModel: jest.fn(),
    } as unknown as ModelProvider;

    const review = await reviewDashboard({
      summary,
      modelProvider,
      logger: loggerMock.create(),
    });

    expect(review).toEqual({
      problems: [
        {
          topic: 'grid',
          severity: 'miss',
          detail: 'Metric m1 is full-width.',
          panel_id: 'm1',
        },
      ],
    });
    expect(invoke).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.arrayContaining(['system', expect.stringContaining('List only problems')]),
        expect.arrayContaining(['human', expect.stringContaining('full-width metric')]),
      ])
    );
    expect(modelProvider.selectModel).toHaveBeenCalledWith({ effortLevel: 'low' });
    expect(modelProvider.getDefaultModel).not.toHaveBeenCalled();
  });

  it('returns no problems when the judge call fails so generate still succeeds', async () => {
    const modelProvider = {
      hasFastModel: jest.fn().mockResolvedValue(false),
      selectModel: jest.fn(),
      getDefaultModel: jest.fn().mockRejectedValue(new Error('no model')),
    } as unknown as ModelProvider;

    await expect(
      reviewDashboard({
        summary,
        modelProvider,
        logger: loggerMock.create(),
      })
    ).resolves.toEqual({ problems: [] });
  });
});
