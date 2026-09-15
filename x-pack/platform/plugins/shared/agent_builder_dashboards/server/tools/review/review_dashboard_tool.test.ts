/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { dashboardTools } from '../../../common';
import { reviewDashboardTool } from './review_dashboard_tool';
import type { DashboardReviewResultData } from './review_result';
import { runDashboardReview } from './run_dashboard_review';
import { loadScreenshotAttachment } from './screenshot';

jest.mock('./run_dashboard_review', () => ({
  runDashboardReview: jest.fn(),
}));
jest.mock('./screenshot', () => ({
  loadScreenshotAttachment: jest.fn(),
}));

const mockRunReview = runDashboardReview as jest.Mock;
const mockLoadScreenshot = loadScreenshotAttachment as jest.Mock;

const createLogger = (): Logger =>
  ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger);

const dashboardData = {
  title: 'Logs',
  panels: [
    {
      type: LENS_EMBEDDABLE_TYPE,
      id: 'p1',
      grid: { x: 0, y: 0, w: 12, h: 5 },
      config: {
        type: 'metric',
        data_source: { type: 'esql', query: 'FROM a | STATS c = COUNT(*)' },
      },
    },
  ],
};

const dashboardRecord = {
  id: 'dash',
  type: DASHBOARD_ATTACHMENT_TYPE,
  active: true,
  current_version: 2,
  versions: [
    { version: 1, data: { title: 'Old', panels: [] } },
    { version: 2, data: dashboardData },
  ],
};

const createAttachments = (record: unknown) => ({
  getAttachmentRecord: jest.fn().mockReturnValue(record),
  add: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const reviewOutput = {
  unreviewed_panel_ids: [],
  panel_findings: [{ panel_id: 'p1', findings: ['Remove the panel title.'] }],
  reviewed_panel_ids: ['p1'],
  could_not_assess: [],
};

const runHandler = async (
  params: Record<string, unknown>,
  attachments = createAttachments(dashboardRecord)
) => {
  const logger = createLogger();
  const getFilesStart = jest.fn();
  const tool = reviewDashboardTool({ getFilesStart });
  const result = (await tool.handler(
    params as never,
    {
      attachments: attachments as never,
      modelProvider: { selectModel: jest.fn() } as never,
      logger,
    } as never
  )) as { results: Array<{ type: string; data: Record<string, unknown> }> };
  return { result, attachments, logger };
};

describe('reviewDashboardTool', () => {
  beforeEach(() => {
    mockRunReview.mockReset();
    mockLoadScreenshot.mockReset();
    mockRunReview.mockResolvedValue(reviewOutput);
  });

  it('is registered under the review tool id and requires only the dashboard attachment id and accepts bounded user preferences', () => {
    const tool = reviewDashboardTool({ getFilesStart: jest.fn() });
    expect(tool.id).toBe(dashboardTools.reviewDashboard);
    expect(tool.schema.safeParse({}).success).toBe(false);
    expect(tool.schema.safeParse({ dashboardAttachmentId: 'dash' }).success).toBe(true);
    expect(
      tool.schema.safeParse({
        dashboardAttachmentId: 'dash',
        userPreferences: 'Keep the existing colors.',
      }).success
    ).toBe(true);
    expect(
      tool.schema.safeParse({ dashboardAttachmentId: 'dash', userPreferences: 'x'.repeat(2049) })
        .success
    ).toBe(false);
  });

  it('reviews the latest version of the dashboard attachment without writing to it', async () => {
    const { result, attachments } = await runHandler({
      dashboardAttachmentId: 'dash',
      userPreferences: 'Keep the red error series.',
    });

    expect(mockRunReview).toHaveBeenCalledWith(
      expect.objectContaining({
        dashboardData,
        userPreferences: 'Keep the red error series.',
        screenshot: undefined,
      })
    );
    expect(attachments.add).not.toHaveBeenCalled();
    expect(attachments.update).not.toHaveBeenCalled();
    expect(attachments.delete).not.toHaveBeenCalled();

    const [{ type, data }] = result.results;
    expect(type).toBe(ToolResultType.other);
    const review = data as unknown as DashboardReviewResultData;
    expect(review.attachment_id).toBe('dash');
    expect(review.version).toBe(2);
    expect(review.visual_assessment).toBe('configuration_only');
    expect(review.unreviewed_panel_ids).toEqual([]);
    expect(review.reviewed_panel_ids).toEqual(['p1']);
    expect(review.panel_findings).toEqual([
      { panel_id: 'p1', findings: ['Remove the panel title.'] },
    ]);
  });

  it('loads a matching screenshot without requiring user preferences', async () => {
    mockLoadScreenshot.mockResolvedValue({
      status: 'loaded',
      screenshot: { base64: 'QUJD', mimeType: 'image/png' },
    });

    const { result } = await runHandler({
      dashboardAttachmentId: 'dash',
      screenshotAttachmentId: 'shot',
    });

    expect(mockLoadScreenshot).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentId: 'shot' })
    );
    expect(mockRunReview).toHaveBeenCalledWith(
      expect.objectContaining({ screenshot: { base64: 'QUJD', mimeType: 'image/png' } })
    );
    expect(result.results[0].data.visual_assessment).toBe('screenshot');
  });

  it('falls back to a configuration-only review when the screenshot cannot be loaded', async () => {
    mockLoadScreenshot.mockResolvedValue({ status: 'unavailable', reason: 'file gone' });

    const { result, logger } = await runHandler({
      dashboardAttachmentId: 'dash',
      screenshotAttachmentId: 'shot',
    });

    expect(mockRunReview).toHaveBeenCalledWith(expect.objectContaining({ screenshot: undefined }));
    expect(result.results[0].data.visual_assessment).toBe('configuration_only');
    expect(result.results[0].data.screenshot_note).toBe('file gone');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('reports an incomplete review when panels are missing from the reviewer output', async () => {
    mockRunReview.mockResolvedValue({
      ...reviewOutput,
      reviewed_panel_ids: [],
      unreviewed_panel_ids: ['p1'],
    });

    const { result } = await runHandler({ dashboardAttachmentId: 'dash' });

    expect(result.results[0].data.unreviewed_panel_ids).toEqual(['p1']);
  });

  it('returns an error result for a missing attachment', async () => {
    const { result } = await runHandler(
      { dashboardAttachmentId: 'missing' },
      createAttachments(undefined)
    );

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain('not found');
    expect(mockRunReview).not.toHaveBeenCalled();
  });

  it('returns an error result for a non-dashboard attachment', async () => {
    const { result } = await runHandler(
      { dashboardAttachmentId: 'dash' },
      createAttachments({ ...dashboardRecord, type: 'image' })
    );

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain(
      `is not a ${DASHBOARD_ATTACHMENT_TYPE} attachment`
    );
  });

  it('returns an error result when the review itself fails', async () => {
    mockRunReview.mockRejectedValue(new Error('model unavailable'));

    const { result } = await runHandler({ dashboardAttachmentId: 'dash' });

    expect(result.results[0].type).toBe(ToolResultType.error);
    expect(result.results[0].data.message).toContain('model unavailable');
  });
});
