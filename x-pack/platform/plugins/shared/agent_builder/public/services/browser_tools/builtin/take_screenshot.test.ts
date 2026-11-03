/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callContext } from './test_helpers.mock';
import { createTakeScreenshotTool } from './take_screenshot';
import { captureViewport } from './screenshot/capture_viewport';

jest.mock('./screenshot/capture_viewport', () => ({ captureViewport: jest.fn() }));

const captureMock = captureViewport as jest.MockedFunction<typeof captureViewport>;

describe('take_screenshot', () => {
  beforeEach(() => {
    captureMock.mockReset();
    captureMock.mockResolvedValue({
      width: 100,
      height: 50,
      toDataURL: () => 'data:image/png;base64,QUJD',
    } as unknown as HTMLCanvasElement);
  });

  it('returns a png image payload and the viewport size', async () => {
    const result = await createTakeScreenshotTool().handler({}, callContext());
    expect(result).toEqual({
      content: { viewport: { width: window.innerWidth, height: window.innerHeight } },
      images: [
        {
          mimeType: 'image/png',
          base64: 'QUJD',
          name: 'screenshot.png',
          description: 'Screenshot of the current viewport',
        },
      ],
    });
  });

  it('does not capture when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      createTakeScreenshotTool().handler({}, callContext(controller.signal))
    ).rejects.toThrow('aborted');
    expect(captureMock).not.toHaveBeenCalled();
  });
});
