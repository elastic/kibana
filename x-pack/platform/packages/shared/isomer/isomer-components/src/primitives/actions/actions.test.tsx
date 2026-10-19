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
import type { ActionsNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Actions, Composition, Context, Divider, Header, Markdown, Quote, toComposition } =
  buildJsxShim(componentsPrimitives);

const URL = 'https://kibana.example.com/app/investigations/1';

const links = (...buttons: ActionsNode['buttons']): ActionsNode => ({ type: 'actions', buttons });

describe('actions', () => {
  it('takes 1 to 5 buttons with navigable URLs', () => {
    const view = (node: ActionsNode) => validate({ type: 'view', body: [node] });

    expect(view(links()).valid).toBe(false);
    expect(view(links(...Array(6).fill({ label: 'a', url: URL }))).valid).toBe(false);
    expect(view(links({ label: 'Run', url: 'data:text/html,<b>hi</b>' })).valid).toBe(false);
    expect(view(links({ label: ' ', url: URL })).valid).toBe(false);
    expect(view(links({ label: 'Open', url: '/app/discover' })).valid).toBe(true);
  });

  it('renders a Slack actions block of link buttons', () => {
    expect(
      surfaces.slack.renderNode(
        links(
          { label: 'View Full Investigation', url: URL, primary: true },
          { label: 'Docs', url: URL }
        )
      ).blocks
    ).toEqual([
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Full Investigation', emoji: true },
            url: URL,
            style: 'primary',
          },
          { type: 'button', text: { type: 'plain_text', text: 'Docs', emoji: true }, url: URL },
        ],
      },
    ]);
  });

  it('drops buttons Slack cannot open, and the block when none are left', () => {
    const relative = { label: 'Open', url: '/app/discover' };

    expect(surfaces.slack.renderNode(links(relative, { label: 'Docs', url: URL })).blocks).toEqual([
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Docs', emoji: true }, url: URL },
        ],
      },
    ]);
    expect(surfaces.slack.renderNode(links(relative)).blocks).toEqual([]);
  });

  it('renders links on the other surfaces', () => {
    const node = links({ label: 'Open', url: '/app/discover' }, { label: 'Docs', url: URL });

    expect(renderToStaticMarkup(surfaces.react.renderNode(node))).toBe(
      `<p class="componentsActions-root"><a href="/app/discover" class="componentsActions-button">Open</a><a href="${URL}" class="componentsActions-button">Docs</a></p>`
    );
    expect(surfaces.markdown.renderNode(node)).toBe(`[Open](/app/discover) · [Docs](${URL})`);
    expect(surfaces.text.renderNode(node)).toBe(`Open: /app/discover\nDocs: ${URL}`);
  });

  it('fills the primary button in React', () => {
    const markup = renderToStaticMarkup(
      surfaces.react.renderNode(links({ label: 'Investigate', url: URL, primary: true }))
    );

    expect(markup).toContain('class="componentsActions-button componentsActions-primary"');
  });

  it('is authored from Actions.Button children', () => {
    expect(
      toComposition(
        <Composition>
          <Actions>
            <Actions.Button url={URL} primary>
              View Full Investigation
            </Actions.Button>
          </Actions>
        </Composition>
      ).body
    ).toEqual([links({ label: 'View Full Investigation', url: URL, primary: true })]);
  });

  // The envelope's section rhythm adds a divider before each later header and before actions.
  it('lays out a completed investigation in the blocks a Slack notification uses', () => {
    const { blocks } = surfaces.slack.render(
      toComposition(
        <Composition>
          <Header>Checkout latency doubled</Header>
          <Context>
            <Context.Item>Investigation completed</Context.Item>
            <Context.Item>Automation: Checkout errors</Context.Item>
          </Context>
          <Header level={3}>Impact</Header>
          <Markdown text="Checkout p95 rose from 400 ms to 900 ms." />
          <Divider />
          <Header level={3}>Conclusion</Header>
          <Quote>The 14:05 deploy of payments-api caused the regression.</Quote>
          <Actions>
            <Actions.Button url={URL} primary>
              View Full Investigation
            </Actions.Button>
          </Actions>
        </Composition>
      )
    );

    expect(blocks.map(({ type }) => type)).toEqual([
      'header',
      'context',
      'divider',
      'header',
      'rich_text',
      'divider',
      'header',
      'rich_text',
      'section',
      'divider',
      'actions',
    ]);
    expect(blocks.filter(({ type }) => type === 'header')).toMatchObject([
      { text: { text: 'Checkout latency doubled' } },
      { text: { text: 'Impact' }, level: 3 },
      { text: { text: 'Conclusion' }, level: 3 },
    ]);
  });
});
