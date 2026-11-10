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
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { componentsPack, componentsPrimitives } from '../../pack';
import type { HeaderNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Composition, Header, toComposition } = buildJsxShim(componentsPrimitives);

const heading = (fields: Omit<HeaderNode, 'type'>): HeaderNode => ({ type: 'header', ...fields });
const react = (node: HeaderNode) => renderToStaticMarkup(surfaces.react.renderNode(node));
const slack = (node: HeaderNode) => surfaces.slack.renderNode(node).blocks;

describe('header', () => {
  it('rejects blank text and levels outside 1 to 4', () => {
    const outOfRange = { type: 'header', text: 'A', level: 5 };

    expect(
      validate({ type: 'view', body: [heading({ text: '' })] }).errors.map(({ path }) => path)
    ).toEqual(['body[0].text']);
    expect(validate({ type: 'view', body: [heading({ text: ' \n ' })] }).valid).toBe(false);
    expect(validate({ type: 'view', body: [outOfRange] }).valid).toBe(false);
  });

  it('renders a Slack header block, with a level only when one is set', () => {
    expect(slack(heading({ text: 'Impact', level: 3 }))).toEqual([
      { type: 'header', text: { type: 'plain_text', text: 'Impact', emoji: true }, level: 3 },
    ]);
    expect(slack(heading({ text: 'Title' }))).toEqual([
      { type: 'header', text: { type: 'plain_text', text: 'Title', emoji: true } },
    ]);
  });

  it('collapses whitespace and clamps Slack text to the header limit', () => {
    const [block] = slack(heading({ text: `Line one\n  line two ${'x'.repeat(170)}` }));

    expect(block.type).toBe('header');
    const text = block.type === 'header' ? block.text.text : '';
    expect(text.startsWith('Line one line two ')).toBe(true);
    expect(text.length).toBeLessThanOrEqual(SLACK_LIMITS.headerTextChars);
    expect(text.endsWith('…')).toBe(true);
  });

  it('nests below the composition title in React and Markdown', () => {
    expect(react(heading({ text: 'Title' }))).toBe(
      '<h2 class="componentsHeader-root componentsHeader-level1">Title</h2>'
    );
    expect(react(heading({ text: 'Impact', level: 3 }))).toBe(
      '<h4 class="componentsHeader-root componentsHeader-level3">Impact</h4>'
    );
    expect(surfaces.markdown.renderNode(heading({ text: 'Impact', level: 3 }))).toBe('#### Impact');
    expect(surfaces.text.renderNode(heading({ text: 'Impact' }))).toBe('Impact');
  });

  it('is authored from its text children', () => {
    expect(
      toComposition(
        <Composition>
          <Header level={3}>Impact</Header>
        </Composition>
      ).body
    ).toEqual([heading({ text: 'Impact', level: 3 })]);
  });
});
