/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { generateDashboardTool } from './generate_dashboard_tool';
import { executeDashboardOperations } from './core';
import { reviewDashboard } from './review_dashboard';

jest.mock('./core', () => {
  const actual = jest.requireActual('./core');
  return {
    ...actual,
    executeDashboardOperations: jest.fn(),
  };
});

jest.mock('./time_range', () => ({
  applyDefaultDashboardTimeRange: jest.fn(async ({ dashboardData }) => dashboardData),
}));

jest.mock('./review_dashboard', () => ({
  reviewDashboard: jest.fn(),
}));

const executeDashboardOperationsMock = executeDashboardOperations as jest.MockedFunction<
  typeof executeDashboardOperations
>;
const reviewDashboardMock = reviewDashboard as jest.MockedFunction<typeof reviewDashboard>;

const persistedDashboard = {
  title: 'Logs',
  panels: [
    {
      type: LENS_EMBEDDABLE_TYPE,
      id: 'm1',
      grid: { x: 0, y: 0, w: 48, h: 5 },
      config: { type: 'metric' },
    },
  ],
};

const reviewProblems = {
  problems: [
    {
      topic: 'grid' as const,
      severity: 'miss' as const,
      detail: 'Metric m1 is full-width.',
      panel_id: 'm1',
    },
  ],
};

describe('generateDashboardTool', () => {
  it('caps prettify follow-up generates in the trusted tool description', () => {
    expect(generateDashboardTool().description).toContain('at most twice this round');
    expect(generateDashboardTool().description).toContain(
      'Do not call a third time to chase leftover review.problems'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    executeDashboardOperationsMock.mockResolvedValue({
      dashboardData: persistedDashboard,
      failures: [],
      panelAuthoringNotes: [],
    });
    reviewDashboardMock.mockResolvedValue(reviewProblems);
  });

  it('attaches the post-generate review when creating a new dashboard', async () => {
    const tool = generateDashboardTool();
    const result = await tool.handler(
      {
        operations: [{ operation: 'set_metadata', title: 'Logs' }],
      },
      {
        logger: loggerMock.create(),
        attachments: {
          add: jest.fn().mockResolvedValue({ id: 'att-1', current_version: 1 }),
          update: jest.fn(),
          getAttachmentRecord: jest.fn(),
        },
        events: {},
        esClient: {},
        modelProvider: { hasFastModel: jest.fn() },
      } as never
    );

    expect(result).toEqual({
      results: [
        expect.objectContaining({
          type: ToolResultType.dashboard,
          data: expect.objectContaining({
            attachment_id: 'att-1',
            version: 1,
            dashboard: expect.objectContaining({
              title: 'Logs',
              panels: [expect.objectContaining({ id: 'm1', chart_type: 'metric' })],
            }),
            review: reviewProblems,
          }),
        }),
      ],
    });
    expect(reviewDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboard: persistedDashboard,
      })
    );
  });

  it('attaches the post-generate review when updating an existing dashboard', async () => {
    const tool = generateDashboardTool();
    const result = await tool.handler(
      {
        dashboardAttachmentId: 'att-1',
        operations: [{ operation: 'set_metadata', title: 'Logs' }],
      },
      {
        logger: loggerMock.create(),
        attachments: {
          add: jest.fn(),
          update: jest.fn().mockResolvedValue({ id: 'att-1', current_version: 2 }),
          getAttachmentRecord: jest.fn().mockReturnValue({
            id: 'att-1',
            type: DASHBOARD_ATTACHMENT_TYPE,
            current_version: 1,
            versions: [
              {
                version: 1,
                data: persistedDashboard,
                created_at: '2026-01-01T00:00:00.000Z',
                content_hash: 'hash',
              },
            ],
          }),
        },
        events: {},
        esClient: {},
        modelProvider: { hasFastModel: jest.fn() },
      } as never
    );

    expect(reviewDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboard: persistedDashboard,
      })
    );
    expect(result).toEqual({
      results: [
        expect.objectContaining({
          type: ToolResultType.dashboard,
          data: expect.objectContaining({
            attachment_id: 'att-1',
            version: 2,
            dashboard: expect.objectContaining({ title: 'Logs' }),
            review: reviewProblems,
          }),
        }),
      ],
    });
  });
});
