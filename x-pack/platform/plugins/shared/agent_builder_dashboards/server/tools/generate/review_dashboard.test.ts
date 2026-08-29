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
  controls: [
    {
      id: 'c1',
      type: 'options_list_control',
      title: 'Response Status',
      esql_query: 'FROM kibana_sample_data_logs | STATS BY `response`',
    },
  ],
};

describe('reviewDashboard', () => {
  it('returns structured problems from the judge and does not invent field-name fixes', async () => {
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
    const [systemMessage, humanMessage] = invoke.mock.calls[0][0] as Array<[string, string]>;
    expect(systemMessage[1]).toContain('List only problems');
    expect(systemMessage[1]).toContain('Do not validate field names');
    expect(humanMessage[1]).toContain('full-width metric');
    expect(humanMessage[1]).toContain('Do not flag control field names');
    expect(humanMessage[1]).toContain('Response Status');
    expect(humanMessage[1]).not.toContain('esql_query');
    expect(humanMessage[1]).not.toContain('kibana_sample_data_logs');
    expect(humanMessage[1]).not.toContain('`response`');
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
