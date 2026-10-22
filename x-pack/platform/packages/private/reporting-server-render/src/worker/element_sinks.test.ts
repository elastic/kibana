/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHeadlessDomEnvironment } from './headless_dom_environment';
import { matchPanelsToElements, sinkPanelElement } from './element_sinks';
import { parseStylesheets } from '../lowering/takumi_css';
import type { PanelPixelPosition } from './dashboard_panel_layout';

const position = (overrides: Partial<PanelPixelPosition> = {}): PanelPixelPosition => ({
  panelIndex: 'panel-1',
  left: 0,
  top: 0,
  width: 100,
  height: 100,
  ...overrides,
});

describe('matchPanelsToElements', () => {
  it('pairs positions with their [data-shared-item] by grid item id, not DOM order', () => {
    const env = createHeadlessDomEnvironment();
    try {
      // Mounted in the opposite order from the positions list.
      env.document.body.innerHTML =
        '<div id="panel-second"><div data-shared-item id="second-el"></div></div>' +
        '<div id="panel-first"><div data-shared-item id="first-el"></div></div>';
      const positions = [position({ panelIndex: 'first' }), position({ panelIndex: 'second' })];

      const matched = matchPanelsToElements(env.document, positions);

      expect(matched).toHaveLength(2);
      expect((matched[0].element as HTMLElement).id).toBe('first-el');
      expect(matched[0].position.panelIndex).toBe('first');
      expect((matched[1].element as HTMLElement).id).toBe('second-el');
    } finally {
      env.dispose();
    }
  });

  it('throws naming the panel when it has no rendered element', () => {
    const env = createHeadlessDomEnvironment();
    try {
      env.document.body.innerHTML = '<div id="panel-a"><div data-shared-item></div></div>';
      expect(() =>
        matchPanelsToElements(env.document, [
          position({ panelIndex: 'a' }),
          position({ panelIndex: 'b', title: 'Missing' }),
        ])
      ).toThrow(/panel "b" \(Missing\)/);
    } finally {
      env.dispose();
    }
  });
});

const panelCss = (...sheets: string[]) => ({
  parsedSheets: parseStylesheets(sheets),
  bytesIn: sheets.join('').length,
});

describe('sinkPanelElement', () => {
  it('renders a DOM-only panel to a bare PNG image panel, with no composer title', async () => {
    const env = createHeadlessDomEnvironment();
    try {
      env.document.body.innerHTML =
        '<div data-shared-item class="p"><figcaption>My panel</figcaption><p>hello</p></div>';
      const element = env.document.getElementsByClassName('p')[0];

      const composed = await sinkPanelElement(
        env,
        element,
        position({ title: 'My panel', width: 120, height: 60 }),
        panelCss('.p{color:#f00;font-size:20px}')
      );

      expect(composed.html).toMatch(/^<img src="data:image\/png;base64,/);
      expect(composed.bare).toBe(true);
      // The real header is in the rasterized clone; the composer must not draw a second title.
      expect(composed.title).toBeUndefined();
      expect(composed).toMatchObject({ left: 0, top: 0, width: 120, height: 60 });
    } finally {
      env.dispose();
    }
  });

  it('keeps DOM around a chart canvas by swapping the canvas for an image in place', async () => {
    const env = createHeadlessDomEnvironment();
    try {
      env.document.body.innerHTML =
        '<div data-shared-item class="p"><div class="legend">Legend text</div><canvas width="200" height="100" style="width:100px;height:50px"></canvas></div>';
      const element = env.document.getElementsByClassName('p')[0];
      const canvas = element.getElementsByTagName('canvas')[0] as HTMLCanvasElement;
      const ctx = canvas.getContext('2d') as unknown as { fillStyle: string; fillRect: Function };
      ctx.fillStyle = '#00f';
      ctx.fillRect(0, 0, 200, 100);

      const composed = await sinkPanelElement(
        env,
        element,
        position({ width: 100, height: 100 }),
        panelCss('.legend{color:#333}')
      );

      expect(composed.html).toContain('<img');
      // The live element is untouched by the sink (it works on a clone).
      expect(element.getElementsByTagName('canvas')).toHaveLength(1);
      expect(
        env.usageLog.getEntries().find((e) => e.name === 'panelCss.lowered')?.detail
      ).toContain('1 canvas(es)');
    } finally {
      env.dispose();
    }
  });

  it('survives inline styles Takumi rejects (overflow: auto) instead of failing the render', async () => {
    const env = createHeadlessDomEnvironment();
    try {
      env.document.body.innerHTML =
        '<div data-shared-item class="p"><div style="overflow:auto;position:sticky;grid-template-rows:min-content auto"><p>row</p></div></div>';
      const element = env.document.getElementsByClassName('p')[0];

      await expect(
        sinkPanelElement(env, element, position({ width: 100, height: 60 }), panelCss(''))
      ).resolves.toMatchObject({ bare: true });
      expect(env.usageLog.getEntries().map((e) => e.name)).not.toContain(
        'takumi.panelRenderFailed'
      );
    } finally {
      env.dispose();
    }
  });
});
