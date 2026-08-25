/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
import {
  captureAppMainScreenshot,
  pickScreenshotEncoding,
  resolveDashboardCaptureElement,
} from './capture_app_main_screenshot';

const mockToBlob = jest.fn();

jest.mock('dom-to-image-more', () => ({
  __esModule: true,
  default: {
    toBlob: (...args: unknown[]) => mockToBlob(...args),
  },
}));

describe('pickScreenshotEncoding', () => {
  it('returns undefined for an empty candidate list', () => {
    expect(pickScreenshotEncoding([])).toBeUndefined();
  });

  it('prefers png when it is within 20% of the smallest lossy encode', () => {
    const picked = pickScreenshotEncoding([
      { mimeType: 'image/png', data: 'p'.repeat(110) },
      { mimeType: 'image/jpeg', data: 'j'.repeat(100) },
    ]);
    expect(picked?.mimeType).toBe('image/png');
  });

  it('picks the smallest encode when png is much larger', () => {
    const picked = pickScreenshotEncoding([
      { mimeType: 'image/png', data: 'p'.repeat(200) },
      { mimeType: 'image/jpeg', data: 'j'.repeat(100) },
    ]);
    expect(picked?.mimeType).toBe('image/jpeg');
  });
});

describe('resolveDashboardCaptureElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('prefers dashboardContainer over the app scroll container', () => {
    const scroll = document.createElement('div');
    scroll.id = APP_MAIN_SCROLL_CONTAINER_ID;
    const dashboard = document.createElement('div');
    dashboard.setAttribute('data-test-subj', 'dashboardContainer');
    scroll.appendChild(dashboard);
    document.body.appendChild(scroll);

    expect(resolveDashboardCaptureElement()).toBe(dashboard);
  });

  it('falls back to the app scroll container when dashboard nodes are missing', () => {
    const scroll = document.createElement('div');
    scroll.id = APP_MAIN_SCROLL_CONTAINER_ID;
    document.body.appendChild(scroll);

    expect(resolveDashboardCaptureElement()).toBe(scroll);
  });
});

describe('captureAppMainScreenshot', () => {
  beforeEach(() => {
    mockToBlob.mockReset();
    document.body.innerHTML = '';
  });

  it('returns undefined when the scroll container is missing', async () => {
    await expect(captureAppMainScreenshot()).resolves.toBeUndefined();
    expect(mockToBlob).not.toHaveBeenCalled();
  });

  it('returns a png payload when capture succeeds and canvas compression is unavailable', async () => {
    const el = document.createElement('div');
    el.setAttribute('data-test-subj', 'dashboardContainer');
    Object.defineProperty(el, 'offsetWidth', { value: 100 });
    Object.defineProperty(el, 'offsetHeight', { value: 50 });
    Object.defineProperty(el, 'scrollWidth', { value: 100 });
    Object.defineProperty(el, 'scrollHeight', { value: 50 });
    document.body.appendChild(el);

    // Force PNG fallback by making createImageBitmap unavailable
    const original = global.createImageBitmap;
    // @ts-expect-error override for test
    global.createImageBitmap = undefined;

    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    mockToBlob.mockResolvedValue(new Blob([pngBytes], { type: 'image/png' }));

    const result = await captureAppMainScreenshot();

    expect(result?.mimeType).toBe('image/png');
    expect(result?.name).toBe('dashboard-screenshot.png');
    expect(result?.blob.size).toBeGreaterThan(0);
    expect(mockToBlob).toHaveBeenCalled();

    global.createImageBitmap = original;
  });

  it('captures the dashboard content node at full height, not the visible scroll viewport', async () => {
    const scroll = document.createElement('div');
    scroll.id = APP_MAIN_SCROLL_CONTAINER_ID;
    Object.defineProperty(scroll, 'offsetWidth', { value: 800 });
    Object.defineProperty(scroll, 'offsetHeight', { value: 400 });
    Object.defineProperty(scroll, 'scrollWidth', { value: 800 });
    Object.defineProperty(scroll, 'scrollHeight', { value: 2400 });

    const dashboard = document.createElement('div');
    dashboard.setAttribute('data-test-subj', 'dashboardContainer');
    Object.defineProperty(dashboard, 'offsetWidth', { value: 800 });
    Object.defineProperty(dashboard, 'offsetHeight', { value: 2400 });
    Object.defineProperty(dashboard, 'scrollWidth', { value: 800 });
    Object.defineProperty(dashboard, 'scrollHeight', { value: 2400 });
    scroll.appendChild(dashboard);
    document.body.appendChild(scroll);

    const original = global.createImageBitmap;
    // @ts-expect-error override for test
    global.createImageBitmap = undefined;

    mockToBlob.mockImplementation(
      async (node: HTMLElement, options: { width: number; height: number }) => {
        expect(node).toBe(dashboard);
        expect(options.width).toBe(800);
        expect(options.height).toBe(2400);
        return new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
      }
    );

    await captureAppMainScreenshot();

    expect(mockToBlob).toHaveBeenCalledTimes(1);
    // Dashboard content capture should not mutate the scroll container styles.
    expect(scroll.style.height).toBe('');
    expect(scroll.style.overflow).toBe('');

    global.createImageBitmap = original;
  });

  it('restores scroll-container styles when falling back to app-main-scroll capture fails', async () => {
    const el = document.createElement('div');
    el.id = APP_MAIN_SCROLL_CONTAINER_ID;
    el.style.overflow = 'auto';
    Object.defineProperty(el, 'offsetWidth', { value: 100 });
    Object.defineProperty(el, 'offsetHeight', { value: 50 });
    Object.defineProperty(el, 'scrollWidth', { value: 100 });
    Object.defineProperty(el, 'scrollHeight', { value: 500 });
    document.body.appendChild(el);
    mockToBlob.mockRejectedValue(new Error('capture failed'));

    await expect(captureAppMainScreenshot()).resolves.toBeUndefined();
    expect(el.style.overflow).toBe('auto');
    expect(el.style.height).toBe('');
  });
});
