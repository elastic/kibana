/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserToolDefinition } from '@kbn/agent-builder-browser';
import { builtinBrowserToolIds, takeScreenshotSchema } from '@kbn/agent-builder-common';
import { getBuiltinDescription } from './get_description';
import { captureViewport } from './screenshot/capture_viewport';
import { downscaleCanvas, SCREENSHOT_MAX_LONG_EDGE } from './screenshot/downscale';

const PNG_DATA_URL_PREFIX = 'data:image/png;base64,';

export const createTakeScreenshotTool = (): BrowserToolDefinition<Record<string, never>> => ({
  id: builtinBrowserToolIds.takeScreenshot,
  description: getBuiltinDescription(builtinBrowserToolIds.takeScreenshot),
  schema: takeScreenshotSchema as BrowserToolDefinition<Record<string, never>>['schema'],
  handler: async (_params, { signal }) => {
    if (signal.aborted) {
      throw new Error('aborted');
    }
    const canvas = downscaleCanvas(await captureViewport(), SCREENSHOT_MAX_LONG_EDGE);
    const base64 = canvas.toDataURL('image/png').replace(PNG_DATA_URL_PREFIX, '');
    return {
      content: { viewport: { width: window.innerWidth, height: window.innerHeight } },
      images: [
        {
          mimeType: 'image/png',
          base64,
          name: 'screenshot.png',
          description: 'Screenshot of the current viewport',
        },
      ],
    };
  },
});
