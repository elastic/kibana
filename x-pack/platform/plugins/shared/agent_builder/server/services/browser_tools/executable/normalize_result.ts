/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type {
  BrowserToolImagePayload,
  BrowserToolResultPayload,
  ImageResult,
  ToolResult,
} from '@kbn/agent-builder-common';
import { createErrorResult, getToolResultId } from '@kbn/agent-builder-server';

const otherResult = (data: Record<string, unknown>): ToolResult => ({
  tool_result_id: getToolResultId(),
  type: ToolResultType.other,
  data,
});

/**
 * Converts the payload posted by the browser into tool results.
 * Images are uploaded through `uploadImage` and appended after the content.
 */
export const normalizeBrowserToolResult = async ({
  result,
  uploadImage,
}: {
  result: BrowserToolResultPayload;
  uploadImage: (image: BrowserToolImagePayload) => Promise<ImageResult>;
}): Promise<ToolResult[]> => {
  if (result.status === 'error') {
    return [createErrorResult(result.message)];
  }

  const { content, images = [] } = result;
  const results: ToolResult[] = [];

  if (typeof content === 'string') {
    results.push(otherResult({ content }));
  } else if (content !== undefined) {
    results.push(otherResult(content));
  }

  // sequential, so image attachments are added in the order the browser sent them;
  // a failed image is reported on its own and does not discard the rest of the answer
  for (const [index, image] of images.entries()) {
    try {
      results.push(await uploadImage(image));
    } catch (error) {
      const label = image.name ?? String(index + 1);
      const message = error instanceof Error ? error.message : String(error);
      results.push(createErrorResult(`Image ${label} could not be stored: ${message}`));
    }
  }

  if (results.length === 0) {
    results.push(otherResult({ status: 'done' }));
  }

  return results;
};
