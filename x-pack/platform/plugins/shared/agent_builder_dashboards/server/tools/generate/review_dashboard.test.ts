/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { ModelProvider } from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';
import {
  dashboardReviewLlmSchema,
  normalizeDashboardReview,
  reviewDashboard,
} from './review_dashboard';

const dashboard: DashboardAttachmentData = {
  title: 'Logs',
  panels: [
    {
      type: 'lens',
      id: 'm1',
      grid: { x: 0, y: 0, w: 48, h: 5 },
      config: {
        type: 'metric',
        title: 'Request count',
        breakdown_by: { column: 'response.keyword' },
      },
    },
    {
      type: 'lens',
      id: 'x1',
      grid: { x: 0, y: 5, w: 48, h: 10 },
      config: {
        type: 'xy',
        styling: { areas: { fill: 'solid' } },
        legend: { visibility: 'visible', statistics: ['avg', 'min', 'max'] },
      },
    },
  ],
  pinned_panels: [
    {
      id: 'c1',
      type: 'options_list_control',
      config: {
        title: 'Response Status',
        esql_query: 'FROM kibana_sample_data_logs | STATS BY `response`',
      },
    },
  ],
};

describe('dashboardReviewLlmSchema', () => {
  it('accepts null panel_id and drops unknown topics so the judge tool call can validate', () => {
    const parsed = dashboardReviewLlmSchema.parse({
      problems: [
        {
          topic: 'grid',
          severity: 'miss',
          detail: 'Metric m1 is full-width.',
          panel_id: null,
        },
        {
          topic: 'xy',
          severity: 'miss',
          detail: 'Solid area fill.',
          panel_id: 'x1',
        },
        {
          topic: 'not_a_topic',
          severity: 'miss',
          detail: 'Dropped.',
        },
      ],
    });

    expect(normalizeDashboardReview(parsed)).toEqual({
      problems: [
        {
          topic: 'grid',
          severity: 'miss',
          detail: 'Metric m1 is full-width.',
        },
        {
          topic: 'xy',
          severity: 'miss',
          detail: 'Solid area fill.',
          panel_id: 'x1',
        },
      ],
    });
  });
});

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
      dashboard,
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
    expect(humanMessage[1]).toContain('DASHBOARD ATTACHMENT:');
    expect(humanMessage[1]).toContain('CHART REVIEW RULES:');
    expect(humanMessage[1]).toContain('solid area fill');
    expect(humanMessage[1]).toContain('legend.statistics');
    expect(humanMessage[1]).toContain('full-width single-value metric');
    expect(humanMessage[1]).toContain('categorical breakdown is not this miss');
    expect(humanMessage[1]).toContain('Do not flag missing field_name, index, or esql_query');
    expect(humanMessage[1]).not.toContain('Required fields: type; field_name and index');
    expect(humanMessage[1]).toContain('Request count');
    expect(humanMessage[1]).toContain('breakdown_by');
    expect(humanMessage[1]).toContain('"fill": "solid"');
    expect(humanMessage[1]).toContain('Response Status');
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
        dashboard,
        modelProvider,
        logger: loggerMock.create(),
      })
    ).resolves.toEqual({ problems: [] });
  });

  it('keeps deterministic ES|QL misses when the judge fails', async () => {
    const modelProvider = {
      hasFastModel: jest.fn().mockResolvedValue(false),
      selectModel: jest.fn(),
      getDefaultModel: jest.fn().mockRejectedValue(new Error('no model')),
    } as unknown as ModelProvider;

    const review = await reviewDashboard({
      dashboard: {
        title: 'Logs',
        panels: [
          {
            type: 'lens',
            id: 'x1',
            grid: { x: 0, y: 0, w: 48, h: 10 },
            config: {
              type: 'xy',
              data_source: {
                type: 'esql',
                query:
                  'FROM logs | STATS count = COUNT() BY bucket = DATE_TRUNC(1 hour, event.ingested)',
              },
            },
          },
        ],
      },
      modelProvider,
      logger: loggerMock.create(),
    });

    expect(review.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topic: 'esql',
          severity: 'miss',
          panel_id: 'x1',
        }),
      ])
    );
  });
});
