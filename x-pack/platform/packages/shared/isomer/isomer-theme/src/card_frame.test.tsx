/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FrameDispatcher } from '@elastic/isomer-sdk';
import { bindFrame } from '@elastic/isomer-sdk';
import { borealisDark, borealisLight } from './borealis_tokens.generated';
import {
  CARD_FALLBACK_NODE_HEIGHT,
  cardContentWidth,
  createKibanaCardFrame,
  kibanaCardFrame,
} from './card_frame';
import { isomerStyleAdapter } from './style_adapter';

const markdown = { type: 'markdown', text: 'There are **3** open alerts.' };

const dispatcher = (height = 0): FrameDispatcher => ({
  renderSnapshot: (node, key) => <p key={key}>{node.type}</p>,
  estimateSnapshotHeight: () => height,
});

const draw = (mode?: 'light' | 'dark') =>
  bindFrame(kibanaCardFrame).render(
    { body: [markdown, markdown] },
    { width: 760, height: 400, mode },
    dispatcher()
  );

describe('kibanaCardFrame', () => {
  it('wraps the body in one root element', () => {
    const element = draw();

    expect(isValidElement(element)).toBe(true);
    expect(renderToStaticMarkup(<>{element}</>)).toMatch(
      /^<div class="isomer" style="[^"]*"><div class="isomerCardBody-root" style="display:block"><p>markdown<\/p><p>markdown<\/p><\/div><\/div>$/
    );
  });

  it('centers the body vertically, so an estimate that runs tall pads it evenly', () => {
    expect(renderToStaticMarkup(<>{draw()}</>)).toMatch(
      /^<div class="isomer" style="[^"]*justify-content:center/
    );
  });

  it("emits the body styles that drop its first and last nodes' outer margins", () => {
    const collector = isomerStyleAdapter.createCollector({});
    const css = isomerStyleAdapter.renderStyles(collector, { scheme: 'light' });

    expect(css).toContain('.isomerCardBody-root>:first-child{margin-top:0}');
    expect(css).toContain('.isomerCardBody-root>:last-child{margin-bottom:0}');
  });

  it('estimates a positive height for a body whose primitives declare none', () => {
    expect(kibanaCardFrame.estimateHeight({ body: [markdown] }, dispatcher())).toBe(
      48 + CARD_FALLBACK_NODE_HEIGHT
    );
  });

  it('sums declared heights and padding', () => {
    expect(kibanaCardFrame.estimateHeight({ body: [markdown, markdown] }, dispatcher(50))).toBe(
      48 + 50 + 50
    );
  });

  it('draws a different background in light and dark', () => {
    const light = renderToStaticMarkup(<>{draw('light')}</>);
    const dark = renderToStaticMarkup(<>{draw('dark')}</>);

    expect(borealisLight.color.background.plain).not.toBe(borealisDark.color.background.plain);
    expect(light).toContain(`background:${borealisLight.color.background.plain}`);
    expect(dark).toContain(`background:${borealisDark.color.background.plain}`);
  });
});

describe('createKibanaCardFrame', () => {
  const widthWhileEstimating = (width: number): number => {
    let seen = 0;
    createKibanaCardFrame({ width }).estimateHeight(
      { body: [markdown] },
      {
        renderSnapshot: () => null,
        estimateSnapshotHeight: () => {
          seen = cardContentWidth();
          return 0;
        },
      }
    );
    return seen;
  };

  it('is 760px wide by default, as kibanaCardFrame is', () => {
    expect(createKibanaCardFrame().defaultWidth).toBe(760);
    expect(kibanaCardFrame.defaultWidth).toBe(760);
  });

  it('sets the content width its primitives wrap at while it estimates, and restores it after', () => {
    const outside = cardContentWidth();

    expect(widthWhileEstimating(320)).toBe(320 - 48);
    expect(widthWhileEstimating(1200)).toBe(1200 - 48);
    expect(cardContentWidth()).toBe(outside);
  });

  it('restores the content width when an estimate throws', () => {
    const outside = cardContentWidth();
    const frame = createKibanaCardFrame({ width: 320 });

    expect(() =>
      frame.estimateHeight(
        { body: [markdown] },
        {
          renderSnapshot: () => null,
          estimateSnapshotHeight: () => {
            throw new Error('estimate failed');
          },
        }
      )
    ).toThrow('estimate failed');
    expect(cardContentWidth()).toBe(outside);
  });
});
