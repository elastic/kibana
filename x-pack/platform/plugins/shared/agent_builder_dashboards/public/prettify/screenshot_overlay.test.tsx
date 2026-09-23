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

const OVERLAY_SELECTOR = '[data-test-subj="prettifyDashboardScreenshotOverlay"]';

describe('showScreenshotOverlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a blocking overlay on the dashboard wrapper and removes it on hide', () => {
    const wrapper = document.createElement('div');
    const dashboard = document.createElement('div');
    dashboard.setAttribute('data-shared-items-container', 'true');
    wrapper.appendChild(dashboard);
    document.body.appendChild(wrapper);

    let hide!: () => void;
    act(() => {
      hide = showScreenshotOverlay(rendering);
    });

    expect(wrapper.querySelector(OVERLAY_SELECTOR)).not.toBeNull();
    // the captured element itself must stay untouched
    expect(dashboard.querySelector(OVERLAY_SELECTOR)).toBeNull();
    expect(wrapper.style.position).toBe('relative');

    act(() => hide());

    expect(document.querySelector(OVERLAY_SELECTOR)).toBeNull();
    expect(wrapper.childElementCount).toBe(1);
    expect(wrapper.style.position).toBe('');
  });

  it('is a no-op when the dashboard element is missing', () => {
    expect(() => showScreenshotOverlay(rendering)()).not.toThrow();
    expect(document.querySelector(OVERLAY_SELECTOR)).toBeNull();
  });
});
