/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { act } from 'react-dom/test-utils';
import type { CoreStart } from '@kbn/core/public';
import { showScreenshotOverlay } from './screenshot_overlay';

const rendering = {
  addContext: (node: ReactNode) => node,
} as unknown as CoreStart['rendering'];

describe('showScreenshotOverlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows a blocking overlay and removes it on hide', () => {
    let hide!: () => void;
    act(() => {
      hide = showScreenshotOverlay(rendering);
    });

    expect(
      document.querySelector('[data-test-subj="prettifyDashboardScreenshotOverlay"]')
    ).not.toBeNull();

    act(() => hide());

    expect(
      document.querySelector('[data-test-subj="prettifyDashboardScreenshotOverlay"]')
    ).toBeNull();
    expect(document.body.childElementCount).toBe(0);
  });
});
