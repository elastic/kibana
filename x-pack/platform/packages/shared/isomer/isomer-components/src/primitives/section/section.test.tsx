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
import type { MarkdownNode } from '../markdown';
import type { SectionNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Composition, Divider, Markdown, Section, toComposition } =
  buildJsxShim(componentsPrimitives);

const prose: MarkdownNode = { type: 'markdown', text: 'Latency doubled.' };
const section = (fields: Omit<SectionNode, 'type'>): SectionNode => ({
  type: 'section',
  ...fields,
});
const slack = (node: SectionNode) => surfaces.slack.render({ type: 'view', body: [node] }).blocks;

describe('section', () => {
  it('rejects a blank title and an empty body', () => {
    const errors = validate({ type: 'view', body: [section({ title: ' ', body: [] })] }).errors;

    expect(errors.map(({ path }) => path).sort()).toEqual(['body[0].body', 'body[0].title']);
  });

  it('validates its children against the composition', () => {
    const blank: MarkdownNode = { ...prose, text: '' };
    const invalidChild = section({ title: 'Impact', body: [blank] });

    expect(validate({ type: 'view', body: [invalidChild] }).errors.map(({ path }) => path)).toEqual(
      ['body[0].body[0].text']
    );
  });

  it('renders a Slack container holding its children', () => {
    expect(slack(section({ title: 'Impact', collapsible: true, body: [prose] }))).toEqual([
      {
        type: 'container',
        title: { type: 'plain_text', text: 'Impact', emoji: true },
        is_collapsible: true,
        child_blocks: [
          {
            type: 'rich_text',
            elements: [
              { type: 'rich_text_section', elements: [{ type: 'text', text: 'Latency doubled.' }] },
            ],
          },
        ],
      },
    ]);
  });

  it('falls back to a level 3 header when its children exceed a container', () => {
    const body = Array.from(
      { length: SLACK_LIMITS.containerChildBlocks + 1 },
      () => ({ type: 'divider' } as const)
    );
    const [first] = slack(section({ title: 'Impact', body }));

    expect(first).toEqual(expect.objectContaining({ type: 'header', level: 3 }));
  });

  it('labels its children on React, Markdown, and text', () => {
    const node = section({ title: 'Impact', body: [prose] });

    expect(renderToStaticMarkup(surfaces.react.renderNode(node))).toContain(
      '<section class="componentsSection-root"><h4 class="componentsSection-title">Impact</h4><div class="componentsMarkdown-root"><p>Latency doubled.</p></div></section>'
    );
    expect(surfaces.markdown.renderNode(node)).toBe('#### Impact\n\nLatency doubled.');
    expect(surfaces.text.renderNode(node)).toBe('Impact\n\nLatency doubled.');
  });

  it('is authored from its node children', () => {
    expect(
      toComposition(
        <Composition>
          <Section title="Impact">
            <Markdown text="Latency doubled." />
            <Divider />
          </Section>
        </Composition>
      ).body
    ).toEqual([section({ title: 'Impact', body: [prose, { type: 'divider' }] })]);
  });
});
