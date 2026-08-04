/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import { captureAppMainScreenshot } from './capture_app_main_screenshot';

const mockToBlob = jest.fn();

jest.mock('dom-to-image-more', () => ({
  __esModule: true,
  default: {
    toBlob: (...args: unknown[]) => mockToBlob(...args),
  },
}));

describe('captureAppMainScreenshot', () => {
  beforeEach(() => {
    mockToBlob.mockReset();
    document.body.innerHTML = '';
  });

  it('returns undefined when the scroll container is missing', async () => {
    await expect(captureAppMainScreenshot()).resolves.toBeUndefined();
    expect(mockToBlob).not.toHaveBeenCalled();
  });

  it('returns a png payload when capture succeeds and jpeg compression is unavailable', async () => {
    const el = document.createElement('div');
    el.id = APP_MAIN_SCROLL_CONTAINER_ID;
    Object.defineProperty(el, 'offsetWidth', { value: 100 });
    Object.defineProperty(el, 'offsetHeight', { value: 50 });
    document.body.appendChild(el);

    // Force PNG fallback by making createImageBitmap unavailable
    const original = global.createImageBitmap;
    // @ts-expect-error override for test
    global.createImageBitmap = undefined;

    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    mockToBlob.mockResolvedValue(new Blob([pngBytes], { type: 'image/png' }));

    const result = await captureAppMainScreenshot();

    expect(result?.media_type).toBe('image/png');
    expect(result?.data.length).toBeGreaterThan(0);
    expect(mockToBlob).toHaveBeenCalled();

    global.createImageBitmap = original;
  });

  it('returns undefined when dom-to-image fails', async () => {
    const el = document.createElement('div');
    el.id = APP_MAIN_SCROLL_CONTAINER_ID;
    document.body.appendChild(el);
    mockToBlob.mockRejectedValue(new Error('capture failed'));

    await expect(captureAppMainScreenshot()).resolves.toBeUndefined();
  });
});
