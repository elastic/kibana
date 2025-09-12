/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error - this module has no exported types
import domtoimage from 'dom-to-image-more';
import { captureScreenshot } from './current_page';
import * as utils from './utils';

jest.mock('dom-to-image-more', () => ({
  toCanvas: jest.fn(),
}));

const mockCanvas = {
  toDataURL: jest.fn(() => 'data:image/png;base64,abc123'),
};

describe('captureScreenshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector === '.kbnAppWrapper') {
        return {} as Element;
      }
      return null;
    });
    jest.spyOn(utils, 'getSelectorForUrl').mockReturnValue('.kbnAppWrapper');
    jest.spyOn(utils, 'waitForNoGlobalLoadingIndicator').mockResolvedValue(undefined);
    jest.spyOn(utils, 'canvasToBlob').mockResolvedValue(new Blob(['test'], { type: 'image/png' }));
    (domtoimage.toCanvas as jest.Mock).mockResolvedValue(mockCanvas);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns image and blob when successful', async () => {
    const result = await captureScreenshot();
    expect(result).not.toBeNull();
    expect(result?.image).toBe('data:image/png;base64,abc123');
    expect(result?.blob).toBeInstanceOf(Blob);
    expect(utils.getSelectorForUrl).toHaveBeenCalledWith(window.location.href);
    expect(utils.waitForNoGlobalLoadingIndicator).toHaveBeenCalled();
    expect(utils.canvasToBlob).toHaveBeenCalledWith(mockCanvas);
  });

  it('returns null if element is not found', async () => {
    (utils.getSelectorForUrl as jest.Mock).mockReturnValue('not-found');
    jest.spyOn(document, 'querySelector').mockReturnValue(null);

    const result = await captureScreenshot();
    expect(result).toBeNull();
  });

  it('returns null if domtoimage.toCanvas throws', async () => {
    (domtoimage.toCanvas as jest.Mock).mockRejectedValue(new Error('fail'));
    const result = await captureScreenshot();
    expect(result).toBeNull();
  });

  it('returns null if waitForNoGlobalLoadingIndicator throws', async () => {
    (utils.waitForNoGlobalLoadingIndicator as jest.Mock).mockRejectedValue(new Error('timeout'));
    const result = await captureScreenshot();
    expect(result).toBeNull();
  });

  it('passes options to waitForNoGlobalLoadingIndicator', async () => {
    await captureScreenshot({ timeout: 90000, stableFor: 2000 });
    expect(utils.waitForNoGlobalLoadingIndicator).toHaveBeenCalledWith(document, 90000 * 2, 2000);
  });
});
