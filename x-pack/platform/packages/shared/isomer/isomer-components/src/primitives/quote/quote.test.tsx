/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { buildJsxShim } from '@elastic/isomer-sdk/author';
import { componentsPack, componentsPrimitives } from '../../pack';
import type { QuoteNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Composition, Quote, toComposition } = buildJsxShim(componentsPrimitives);

const quoted = (text: string): QuoteNode => ({ type: 'quote', text });

describe('quote', () => {
  it('takes up to 3,000 characters', () => {
    expect(validate({ type: 'view', body: [quoted('x'.repeat(3000))] }).valid).toBe(true);
    expect(validate({ type: 'view', body: [quoted('x'.repeat(3001))] }).valid).toBe(false);
    expect(validate({ type: 'view', body: [quoted('')] }).valid).toBe(false);
    expect(validate({ type: 'view', body: [quoted(' \n ')] }).valid).toBe(false);
  });

  it('renders one Slack rich_text quote, with the text unescaped and its lines kept', () => {
    expect(surfaces.slack.renderNode(quoted('a < b & c\nsecond line')).blocks).toEqual([
      {
        type: 'rich_text',
        elements: [
          { type: 'rich_text_quote', elements: [{ type: 'text', text: 'a < b & c\nsecond line' }] },
        ],
      },
    ]);
  });

  it('keeps line breaks on the other surfaces', () => {
    const node = quoted('first <line>\nsecond line');

    expect(renderToStaticMarkup(surfaces.react.renderNode(node))).toBe(
      '<blockquote class="componentsQuote-root">first &lt;line&gt;<br/>second line</blockquote>'
    );
    expect(surfaces.text.renderNode(node)).toBe('> first <line>\n> second line');
    expect(surfaces.markdown.renderNode(node)).toBe('> first \\<line>\\\n> second line');
  });

  it('keeps paragraphs apart in Markdown', () => {
    expect(surfaces.markdown.renderNode(quoted('one\n\ntwo'))).toBe('> one\n>\n> two');
  });

  it('is authored from its text children', () => {
    expect(
      toComposition(
        <Composition>
          <Quote>Payments failed over at 14:05.</Quote>
        </Composition>
      ).body
    ).toEqual([quoted('Payments failed over at 14:05.')]);
  });
});
