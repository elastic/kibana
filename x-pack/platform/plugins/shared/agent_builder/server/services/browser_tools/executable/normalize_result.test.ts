/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { BrowserToolImagePayload, ImageResult } from '@kbn/agent-builder-common';
import { normalizeBrowserToolResult } from './normalize_result';

const imageResultFor = (image: BrowserToolImagePayload): ImageResult => ({
  tool_result_id: `result-${image.name}`,
  type: ToolResultType.image,
  data: {
    attachment_id: `attachment-${image.name}`,
    mime_type: image.mime_type,
    name: image.name,
    description: 'Screenshot taken by browser.tool.',
  },
});

describe('normalizeBrowserToolResult', () => {
  let uploadImage: jest.Mock<Promise<ImageResult>, [BrowserToolImagePayload]>;

  beforeEach(() => {
    uploadImage = jest.fn(async (image) => imageResultFor(image));
  });

  it('error → error result', async () => {
    const results = await normalizeBrowserToolResult({
      result: { status: 'error', message: 'element not found' },
      uploadImage,
    });

    expect(results).toEqual([
      expect.objectContaining({
        type: ToolResultType.error,
        data: { message: 'element not found' },
      }),
    ]);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it('string content → other', async () => {
    const results = await normalizeBrowserToolResult({
      result: { status: 'ok', content: 'page title is Kibana' },
      uploadImage,
    });

    expect(results).toEqual([
      {
        tool_result_id: expect.any(String),
        type: ToolResultType.other,
        data: { content: 'page title is Kibana' },
      },
    ]);
  });

  it('object content → other', async () => {
    const results = await normalizeBrowserToolResult({
      result: { status: 'ok', content: { url: '/app/discover', count: 3 } },
      uploadImage,
    });

    expect(results).toEqual([
      {
        tool_result_id: expect.any(String),
        type: ToolResultType.other,
        data: { url: '/app/discover', count: 3 },
      },
    ]);
  });

  it('void → done', async () => {
    const results = await normalizeBrowserToolResult({
      result: { status: 'ok' },
      uploadImage,
    });

    expect(results).toEqual([
      {
        tool_result_id: expect.any(String),
        type: ToolResultType.other,
        data: { status: 'done' },
      },
    ]);
  });

  it('images → image markers after content (uploadImage called once per image)', async () => {
    const first: BrowserToolImagePayload = { mime_type: 'image/png', base64: 'AAA', name: 'a' };
    const second: BrowserToolImagePayload = { mime_type: 'image/jpeg', base64: 'BBB', name: 'b' };

    const results = await normalizeBrowserToolResult({
      result: { status: 'ok', content: 'two screenshots', images: [first, second] },
      uploadImage,
    });

    expect(uploadImage).toHaveBeenCalledTimes(2);
    expect(uploadImage).toHaveBeenNthCalledWith(1, first);
    expect(uploadImage).toHaveBeenNthCalledWith(2, second);
    expect(results).toEqual([
      {
        tool_result_id: expect.any(String),
        type: ToolResultType.other,
        data: { content: 'two screenshots' },
      },
      imageResultFor(first),
      imageResultFor(second),
    ]);
  });

  it('keeps content and earlier image markers when a later image upload fails', async () => {
    const first: BrowserToolImagePayload = { mime_type: 'image/png', base64: 'AAA', name: 'a' };
    const second: BrowserToolImagePayload = { mime_type: 'image/png', base64: 'BBB', name: 'b' };
    uploadImage.mockImplementation(async (image) => {
      if (image === second) {
        throw new Error('file too large');
      }
      return imageResultFor(image);
    });

    const results = await normalizeBrowserToolResult({
      result: { status: 'ok', content: 'two screenshots', images: [first, second] },
      uploadImage,
    });

    expect(results).toEqual([
      {
        tool_result_id: expect.any(String),
        type: ToolResultType.other,
        data: { content: 'two screenshots' },
      },
      imageResultFor(first),
      expect.objectContaining({
        type: ToolResultType.error,
        data: { message: 'Image b could not be stored: file too large' },
      }),
    ]);
  });

  it('returns an error result per failed image', async () => {
    const named: BrowserToolImagePayload = { mime_type: 'image/png', base64: 'AAA', name: 'a' };
    const unnamed: BrowserToolImagePayload = { mime_type: 'image/png', base64: 'BBB' };
    uploadImage.mockRejectedValue(new Error('boom'));

    const results = await normalizeBrowserToolResult({
      result: { status: 'ok', images: [named, unnamed] },
      uploadImage,
    });

    expect(uploadImage).toHaveBeenCalledTimes(2);
    expect(results).toEqual([
      expect.objectContaining({
        type: ToolResultType.error,
        data: { message: 'Image a could not be stored: boom' },
      }),
      expect.objectContaining({
        type: ToolResultType.error,
        data: { message: 'Image 2 could not be stored: boom' },
      }),
    ]);
  });

  it('images without content → image markers only', async () => {
    const image: BrowserToolImagePayload = { mime_type: 'image/png', base64: 'AAA', name: 'a' };

    const results = await normalizeBrowserToolResult({
      result: { status: 'ok', images: [image] },
      uploadImage,
    });

    expect(results).toEqual([imageResultFor(image)]);
  });
});
