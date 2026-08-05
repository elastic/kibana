/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { createCaptureDashboardScreenshotTool } from './capture_dashboard_screenshot';

const mockCaptureDashboardScreenshot = jest.fn();

jest.mock('./capture', () => ({
  captureDashboardScreenshot: (args: unknown) => mockCaptureDashboardScreenshot(args),
}));

describe('createCaptureDashboardScreenshotTool', () => {
  const core = {} as CoreStart;
  const tool = createCaptureDashboardScreenshotTool({ core });

  beforeEach(() => {
    mockCaptureDashboardScreenshot.mockReset();
  });

  it('declares a two-way image result', () => {
    expect(tool.id).toBe('capture_dashboard_screenshot');
    expect(tool.returnsResult).toBe(true);
    expect(tool.resultType).toBe('image');
  });

  it('validates params through its schema', () => {
    expect(() => tool.schema.parse({ dashboardAttachmentId: 'dash-1' })).not.toThrow();
    expect(() => tool.schema.parse({})).toThrow();
    expect(() => tool.schema.parse({ dashboardAttachmentId: 'x'.repeat(257) })).toThrow();
  });

  it('fails without a conversation id', async () => {
    await expect(tool.handler({ dashboardAttachmentId: 'dash-1' }, {})).rejects.toThrow(
      /conversation has not been persisted/
    );
    expect(mockCaptureDashboardScreenshot).not.toHaveBeenCalled();
  });

  it('delegates to the capture implementation with the conversation id', async () => {
    mockCaptureDashboardScreenshot.mockResolvedValue({ content: 'data:image/jpeg;base64,x' });

    const result = await tool.handler(
      { dashboardAttachmentId: 'dash-1' },
      { conversationId: 'conv-1' }
    );

    expect(mockCaptureDashboardScreenshot).toHaveBeenCalledWith({
      core,
      conversationId: 'conv-1',
      dashboardAttachmentId: 'dash-1',
    });
    expect(result).toEqual({ content: 'data:image/jpeg;base64,x' });
  });
});
