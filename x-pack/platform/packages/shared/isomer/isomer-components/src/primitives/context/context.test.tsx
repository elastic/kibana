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
import type { ContextNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Composition, Context, toComposition } = buildJsxShim(componentsPrimitives);

const line = (...texts: string[]): ContextNode => ({
  type: 'context',
  items: texts.map((text) => ({ text })),
});
const slackText = (node: ContextNode): string => {
  const [block] = surfaces.slack.renderNode(node).blocks;
  if (block?.type !== 'context') {
    throw new Error(`expected a context block, got ${block?.type}`);
  }
  const [element] = block.elements;
  return element.type === 'mrkdwn' ? element.text : '';
};

describe('context', () => {
  it('takes 1 to 10 items, none blank', () => {
    expect(validate({ type: 'view', body: [line()] }).valid).toBe(false);
    expect(validate({ type: 'view', body: [line('Owner: SRE', ' ')] }).valid).toBe(false);
    expect(validate({ type: 'view', body: [line(...Array(10).fill('a'))] }).valid).toBe(true);
    expect(validate({ type: 'view', body: [line(...Array(11).fill('a'))] }).valid).toBe(false);
  });

  it('joins items into one escaped Slack mrkdwn element', () => {
    expect(
      surfaces.slack.renderNode(line('⏳ Investigating…', 'Automation: <a & b>')).blocks
    ).toEqual([
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: '⏳ Investigating…  ·  Automation: &lt;a &amp; b&gt;' }],
      },
    ]);
  });

  it('clamps the Slack element to its limit without cutting an entity', () => {
    const text = slackText(line(...Array(10).fill(`${'&'.repeat(60)} ${'x'.repeat(400)}`)));

    expect(text.length).toBeLessThanOrEqual(SLACK_LIMITS.contextElementChars);
    expect(text.endsWith('…')).toBe(true);
    expect(text.replace(/&amp;/g, '')).not.toContain('&');
  });

  it('renders one line on the other surfaces', () => {
    const node = line('Owner: SRE', 'Updated\n5 minutes ago');

    expect(renderToStaticMarkup(surfaces.react.renderNode(node))).toBe(
      '<p class="componentsContext-root">Owner: SRE · Updated 5 minutes ago</p>'
    );
    expect(surfaces.text.renderNode(node)).toBe('Owner: SRE · Updated 5 minutes ago');
    expect(surfaces.markdown.renderNode(node)).toBe('Owner: SRE · Updated 5 minutes ago');
  });

  it('is authored from Context.Item children', () => {
    expect(
      toComposition(
        <Composition>
          <Context>
            <Context.Item>Owner: SRE</Context.Item>
            <Context.Item>Updated 5 minutes ago</Context.Item>
          </Context>
        </Composition>
      ).body
    ).toEqual([line('Owner: SRE', 'Updated 5 minutes ago')]);
  });
});
