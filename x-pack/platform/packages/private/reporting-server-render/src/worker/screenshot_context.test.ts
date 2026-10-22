/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JSDOM } from 'jsdom';
import { setScreenshotContext, setScreenshotModeEnabled } from './screenshot_context';

describe('screenshot_context', () => {
  it('stores values under __KBN_SCREENSHOT_CONTEXT__, readable the way getScreenshotContext reads them', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const win = dom.window as unknown as Window & {
      __KBN_SCREENSHOT_CONTEXT__?: Record<string, unknown>;
    };

    setScreenshotContext(dom.window, 'locatorParams', { id: 'DASHBOARD_APP_LOCATOR' });
    setScreenshotContext(dom.window, 'layout', { id: 'preserve_layout' });

    expect(win.__KBN_SCREENSHOT_CONTEXT__).toEqual({
      locatorParams: { id: 'DASHBOARD_APP_LOCATOR' },
      layout: { id: 'preserve_layout' },
    });
  });

  it('marks the page as being in screenshot mode', () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const win = dom.window as unknown as Window & {
      __KBN_SCREENSHOT_MODE_ENABLED_KEY__?: boolean;
    };

    expect(win.__KBN_SCREENSHOT_MODE_ENABLED_KEY__).toBeUndefined();
    setScreenshotModeEnabled(dom.window);
    expect(win.__KBN_SCREENSHOT_MODE_ENABLED_KEY__).toBe(true);
  });
});
