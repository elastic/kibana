/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CoreStart } from '@kbn/core/public';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';

export const CAPTURE_DASHBOARD_SCREENSHOT_TOOL_ID = 'capture_dashboard_screenshot';

const captureDashboardScreenshotSchema = z.object({
  dashboardAttachmentId: z.string().max(256).describe('Id of the dashboard attachment to capture.'),
});

export type CaptureDashboardScreenshotParams = z.infer<typeof captureDashboardScreenshotSchema>;

/**
 * Browser tool that renders a dashboard attachment off-screen in the user's browser and
 * returns a screenshot of it. The screenshot is persisted server-side as a hidden image
 * attachment (`result_type: 'image'`); the model only sees the attachment id.
 */
export const createCaptureDashboardScreenshotTool = ({
  core,
}: {
  core: CoreStart;
}): BrowserApiToolDefinition<CaptureDashboardScreenshotParams> => ({
  id: CAPTURE_DASHBOARD_SCREENSHOT_TOOL_ID,
  description:
    'Captures a screenshot of a dashboard attachment by rendering it in the user’s browser. ' +
    'Returns an image attachment id that visual validation tools accept. ' +
    'Only works while the user has the conversation open in a browser; it fails in headless runs.',
  schema: captureDashboardScreenshotSchema,
  returnsResult: true,
  resultType: 'image',
  handler: async ({ dashboardAttachmentId }, { attachments }) => {
    // The rendering + encoding machinery is heavy (DashboardRenderer, dom-to-image);
    // load it only when the tool actually runs.
    const { captureDashboardScreenshot } = await import('./capture');
    return captureDashboardScreenshot({
      core,
      attachments: attachments ?? [],
      dashboardAttachmentId,
    });
  },
});
