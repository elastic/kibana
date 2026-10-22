/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHeadlessDomEnvironment } from './headless_dom_environment';
import { EMB_PANEL_HEADER_HEIGHT_PX, installPanelRectAssigner } from './panel_rect_assigner';
import type { PanelPixelPosition } from './dashboard_panel_layout';

const position = (panelIndex: string, overrides: Partial<PanelPixelPosition> = {}) => ({
  panelIndex,
  left: 10,
  top: 20,
  width: 400,
  height: 300,
  ...overrides,
});

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('installPanelRectAssigner', () => {
  it('assigns rects by grid item id regardless of mount order, and re-fires observers', async () => {
    const env = createHeadlessDomEnvironment();
    const assigner = installPanelRectAssigner(
      env,
      [position('a'), position('b', { width: 200, height: 100 })],
      env.usageLog
    );
    try {
      // 'b' mounts before 'a'; each has a content wrapper that observes its own size.
      env.document.body.innerHTML =
        '<div id="panel-b"><figure class="embPanel"><div class="embPanel__content"><span id="b-inner"></span></div></figure></div>' +
        '<div id="panel-a"><figure class="embPanel"><div class="embPanel__content"><span id="a-inner"></span></div></figure></div>';
      await nextTick();

      expect(Array.from(assigner.assigned.keys()).sort()).toEqual(['a', 'b']);
      const aInner = env.document.getElementById('a-inner')!;
      const bInner = env.document.getElementById('b-inner')!;
      expect(aInner.getBoundingClientRect()).toMatchObject({ width: 400, height: 300 });
      expect(bInner.getBoundingClientRect()).toMatchObject({ width: 200, height: 100 });
    } finally {
      assigner.dispose();
      env.dispose();
    }
  });

  it('subtracts the header height from the content only when a header exists, even if it mounts later', async () => {
    const env = createHeadlessDomEnvironment();
    const assigner = installPanelRectAssigner(env, [position('a')], env.usageLog);
    try {
      env.document.body.innerHTML =
        '<div id="panel-a"><figure class="embPanel"><div class="embPanel__content"><span id="inner"></span></div></figure></div>';
      await nextTick();
      const inner = env.document.getElementById('inner')!;
      expect(inner.getBoundingClientRect().height).toBe(300);

      const header = env.document.createElement('figcaption');
      header.className = 'embPanel__header';
      env.document.querySelector('figure')!.prepend(header);
      await nextTick();

      expect(inner.getBoundingClientRect().height).toBe(300 - EMB_PANEL_HEADER_HEIGHT_PX);
    } finally {
      assigner.dispose();
      env.dispose();
    }
  });

  it('re-fires a ResizeObserver that observed before the rect was known, and logs noRect first', async () => {
    const env = createHeadlessDomEnvironment();
    const assigner = installPanelRectAssigner(env, [position('a')], env.usageLog);
    try {
      env.document.body.innerHTML = '<div id="panel-a"></div>';
      const target = env.document.createElement('div');
      const callback = jest.fn();
      const observer = new (
        env.window as unknown as { ResizeObserver: typeof ResizeObserver }
      ).ResizeObserver(callback);

      // Detached: no ancestor rect anywhere -> no callback, one log entry.
      observer.observe(target);
      expect(callback).not.toHaveBeenCalled();
      expect(env.usageLog.getEntries().some((e) => e.name === 'ResizeObserver.noRect')).toBe(true);

      env.document.getElementById('panel-a')!.appendChild(target);
      await nextTick();
      // The assigner already ran for panel-a; re-assign through a changed header to re-fire.
      const wrapper = env.document.getElementById('panel-a')!;
      wrapper.innerHTML = '<figure class="embPanel"><div class="embPanel__content"></div></figure>';
      const content = wrapper.getElementsByClassName('embPanel__content')[0];
      content.appendChild(target);
      observer.observe(target);
      await nextTick();

      expect(callback).toHaveBeenCalled();
      const entry = callback.mock.calls[callback.mock.calls.length - 1][0][0];
      expect(entry.contentRect).toMatchObject({ width: 400, height: 300 });
    } finally {
      assigner.dispose();
      env.dispose();
    }
  });
});
