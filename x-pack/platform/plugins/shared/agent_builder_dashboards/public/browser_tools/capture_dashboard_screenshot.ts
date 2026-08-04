/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolResultType } from '@kbn/agent-builder-common';
import type {
  BrowserApiToolDefinition,
  BrowserApiToolHandlerResult,
} from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { captureAppMainScreenshot } from '../attachment_types/capture_app_main_screenshot';

const MAX_SETTLE_MS = 5_000;

const schema = z.object({
  settle_ms: z
    .number()
    .int()
    .min(0)
    .max(MAX_SETTLE_MS)
    .optional()
    .describe(
      `Optional milliseconds to wait for panels to finish rendering before capture (0-${MAX_SETTLE_MS}).`
    ),
});

export type CaptureDashboardScreenshotParams = z.infer<typeof schema>;

export const CAPTURE_DASHBOARD_SCREENSHOT_TOOL_ID = 'capture_dashboard_screenshot';

/**
 * Two-way browser tool: captures the full dashboard content (not just the
 * visible scroll viewport) and returns the image to the LLM.
 */
export const createCaptureDashboardScreenshotTool = (): BrowserApiToolDefinition<
  CaptureDashboardScreenshotParams
> => ({
  id: CAPTURE_DASHBOARD_SCREENSHOT_TOOL_ID,
  returnsResult: true,
  description: `Capture a screenshot of the current dashboard viewport for visual validation.

Call this alone after a successful generate_dashboard that changed layout or panels (use settle_ms >= 1500 so panels finish rendering). The live dashboard is applied mid-round before this tool runs. Use the image to describe overlap, empty charts, cramped titles, or uneven composition, then fix via a follow-up generate_dashboard when needed.

Do not call in parallel with other tools.`,
  schema,
  handler: async ({ settle_ms: settleMs }): Promise<BrowserApiToolHandlerResult> => {
    if (settleMs && settleMs > 0) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, settleMs);
      });
    }

    const image = await captureAppMainScreenshot();
    if (!image) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                'Failed to capture dashboard screenshot. Ensure the dashboard is open in the main app area.',
            },
          },
        ],
      };
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            message: 'Dashboard screenshot captured',
            media_type: image.media_type,
          },
        },
      ],
      image,
    };
  },
});
