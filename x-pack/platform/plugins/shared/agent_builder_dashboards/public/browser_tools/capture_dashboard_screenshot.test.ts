/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { captureAppMainScreenshot } from '../attachment_types/capture_app_main_screenshot';
import {
  CAPTURE_DASHBOARD_SCREENSHOT_TOOL_ID,
  createCaptureDashboardScreenshotTool,
} from './capture_dashboard_screenshot';

jest.mock('../attachment_types/capture_app_main_screenshot', () => ({
  captureAppMainScreenshot: jest.fn(),
}));

const captureAppMainScreenshotMock = captureAppMainScreenshot as jest.MockedFunction<
  typeof captureAppMainScreenshot
>;

describe('createCaptureDashboardScreenshotTool', () => {
  beforeEach(() => {
    captureAppMainScreenshotMock.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exposes a two-way tool id and returnsResult', () => {
    const tool = createCaptureDashboardScreenshotTool();
    expect(tool.id).toBe(CAPTURE_DASHBOARD_SCREENSHOT_TOOL_ID);
    expect(tool.returnsResult).toBe(true);
  });

  it('returns image payload on successful capture', async () => {
    captureAppMainScreenshotMock.mockResolvedValue({
      media_type: 'image/png',
      data: 'abc',
    });
    const tool = createCaptureDashboardScreenshotTool();
    const result = await tool.handler({});
    expect(result).toMatchObject({
      image: { media_type: 'image/png', data: 'abc' },
      results: [{ type: ToolResultType.other }],
    });
  });

  it('returns an error result when capture fails', async () => {
    captureAppMainScreenshotMock.mockResolvedValue(undefined);
    const tool = createCaptureDashboardScreenshotTool();
    const result = await tool.handler({});
    expect(result).toMatchObject({
      results: [{ type: ToolResultType.error }],
    });
  });

  it('waits settle_ms before capturing', async () => {
    captureAppMainScreenshotMock.mockResolvedValue({
      media_type: 'image/jpeg',
      data: 'x',
    });
    const tool = createCaptureDashboardScreenshotTool();
    const promise = tool.handler({ settle_ms: 250 });
    expect(captureAppMainScreenshotMock).not.toHaveBeenCalled();
    jest.advanceTimersByTime(250);
    await promise;
    expect(captureAppMainScreenshotMock).toHaveBeenCalled();
  });
});
