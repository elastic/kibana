/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Replicates what the Chromium screenshotting driver does before navigating
 * (`page.evaluateOnNewDocument(this.screenshotMode.setScreenshotContext, key, value)` in
 * `driver.ts`) and what `redirect_app.tsx` reads back
 * (`screenshotMode.getScreenshotContext(REPORTING_REDIRECT_LOCATOR_STORE_KEY)`), without a
 * dependency on `@kbn/screenshot-mode-plugin` itself: that package's `setScreenshotContext`/
 * `setScreenshotModeEnabled` deliberately avoid importing anything (see the "literal value to
 * prevent adding an external reference" comments in `common/context.ts`/`common/mode.ts`)
 * precisely so they can be reproduced like this in an unrelated execution environment.
 *
 * Must run on the jsdom `window` before any application script executes, exactly like the
 * Chromium path's `evaluateOnNewDocument` runs before the first script on the navigated page.
 */

const KBN_SCREENSHOT_CONTEXT_KEY = '__KBN_SCREENSHOT_CONTEXT__';
const KBN_SCREENSHOT_MODE_ENABLED_KEY = '__KBN_SCREENSHOT_MODE_ENABLED_KEY__';

// A minimal structural type rather than `Window`, so this accepts jsdom's `DOMWindow` (which
// isn't assignable to the ambient DOM `Window`/`typeof globalThis`) as well as a real one.
type ScreenshotWindow = object & {
  [KBN_SCREENSHOT_CONTEXT_KEY]?: Record<string, unknown>;
  [KBN_SCREENSHOT_MODE_ENABLED_KEY]?: boolean;
};

/** Sets one key in the page's screenshot context, as `setScreenshotContext` does. */
export const setScreenshotContext = (window: object, key: string, value: unknown): void => {
  const win = window as ScreenshotWindow;
  if (!win[KBN_SCREENSHOT_CONTEXT_KEY]) {
    Object.defineProperty(win, KBN_SCREENSHOT_CONTEXT_KEY, {
      enumerable: true,
      writable: true,
      configurable: false,
      value: {},
    });
  }
  win[KBN_SCREENSHOT_CONTEXT_KEY]![key] = value;
};

/** Marks the page as being in screenshot mode, as `setScreenshotModeEnabled` does. */
export const setScreenshotModeEnabled = (window: object): void => {
  Object.defineProperty(window as ScreenshotWindow, KBN_SCREENSHOT_MODE_ENABLED_KEY, {
    enumerable: true,
    writable: true,
    configurable: false,
    value: true,
  });
};
