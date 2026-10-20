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
import { CARD_FALLBACK_NODE_HEIGHT, kibanaCardFrame } from './card_frame';

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
      /^<div class="isomer" style="[^"]*"><p>markdown<\/p><p>markdown<\/p><\/div>$/
    );
  });

  it('estimates a positive height for a body whose primitives declare none', () => {
    expect(kibanaCardFrame.estimateHeight({ body: [markdown] }, dispatcher())).toBe(
      48 + CARD_FALLBACK_NODE_HEIGHT
    );
  });

  it('sums declared heights, padding and gaps', () => {
    expect(kibanaCardFrame.estimateHeight({ body: [markdown, markdown] }, dispatcher(50))).toBe(
      48 + 50 + 16 + 50
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
