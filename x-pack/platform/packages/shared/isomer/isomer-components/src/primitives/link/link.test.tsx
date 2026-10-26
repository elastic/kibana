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
import type { ComponentsRenderContext } from '../../lib';
import { componentsPack, componentsPrimitives } from '../../pack';
import type { LinkNode } from '.';

const { surfaces, validate } = createIsomerRuntime({ packs: [componentsPack] });
const { Composition, Link, toComposition } = buildJsxShim(componentsPrimitives);

const DOCS = 'https://www.elastic.co/docs';

const discover: LinkNode = {
  type: 'link',
  label: 'Open in Discover',
  app: 'discover',
  path: "#/?_a=(query:(esql:'FROM logs'))",
};
const docs: LinkNode = { type: 'link', label: 'Docs', url: DOCS };

const view = (node: Partial<LinkNode>) =>
  validate({ type: 'view', body: [{ type: 'link', label: 'Open', ...node }] }).valid;

const slack = (node: LinkNode, baseUrl?: string) =>
  surfaces.slack.renderNode(node, baseUrl === undefined ? {} : { baseUrl }).blocks;

const react = (node: LinkNode, context?: ComponentsRenderContext) =>
  renderToStaticMarkup(<>{surfaces.react.renderNode(node, context ? { context } : {})}</>);

describe('link', () => {
  it('takes exactly one of an app or an absolute URL', () => {
    expect(view({ app: 'discover' })).toBe(true);
    expect(view({ app: 'management', path: '/kibana/skills/triage' })).toBe(true);
    expect(view({ url: DOCS })).toBe(true);
    expect(view({})).toBe(false);
    expect(view({ app: 'discover', url: DOCS })).toBe(false);
    expect(view({ path: '/x', url: DOCS })).toBe(false);
  });

  it('rejects URLs and paths that leave the place they name', () => {
    expect(view({ url: '/app/discover' })).toBe(false);
    expect(view({ url: 'data:text/html,<b>hi</b>' })).toBe(false);
    expect(view({ app: 'discover', path: 'https://evil.example' })).toBe(false);
    expect(view({ app: 'discover', path: '//evil.example' })).toBe(false);
    expect(view({ app: 'discover', path: '/../../evil' })).toBe(false);
    expect(view({ app: 'discover', path: '/\\evil.example' })).toBe(false);
    expect(view({ app: 'discover', path: '/%2e%2e/management' })).toBe(false);
    expect(view({ app: 'discover', path: '/%2E%2E' })).toBe(false);
    expect(view({ app: 'discover', path: '/.%2e/management?x' })).toBe(false);
    expect(view({ app: 'discover', path: '/.\t./management' })).toBe(false);
    expect(view({ app: 'discover/../x' })).toBe(false);
    expect(view({ app: '..' })).toBe(false);
    expect(view({ app: 'discover', path: '#/../x' })).toBe(true);
    expect(view({ app: 'discover', path: '/view/a..b?q=..' })).toBe(true);
  });

  it('joins an app path onto Slack’s base URL, keeping its base path and space', () => {
    const url =
      "https://kibana.example.com/base/s/ops/app/discover#/?_a=(query:(esql:'FROM%20logs'))";
    const block = {
      type: 'section',
      text: { type: 'mrkdwn', text: `<${url}|Open in Discover>` },
    };

    expect(slack(discover, 'https://kibana.example.com/base/s/ops')).toEqual([block]);
    expect(slack(discover, 'https://kibana.example.com/base/s/ops/')).toEqual([block]);
    expect(
      slack({ type: 'link', label: 'Skills', app: 'management' }, 'https://kibana.example.com')
    ).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '<https://kibana.example.com/app/management|Skills>' },
      },
    ]);
  });

  it('renders nothing in Slack for an app link without a base URL', () => {
    expect(slack(discover)).toEqual([]);
  });

  it('links an absolute URL in Slack without a base URL, escaped', () => {
    expect(slack({ type: 'link', label: 'A & <b>', url: 'https://example.com/?a=1&b=|2' })).toEqual(
      [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '<https://example.com/?a=1&amp;b=%7C2|A &amp; &lt;b&gt;>' },
        },
      ]
    );
  });

  it('resolves an app link in React through the host’s resolver', () => {
    const resolveKibanaPath = jest.fn((path: string) => `/base/s/ops${path}`);

    expect(react(discover, { resolveKibanaPath })).toBe(
      '<p class="componentsLink-root"><a href="/base/s/ops/app/discover#/?_a=(query:(esql:&#x27;FROM logs&#x27;))" class="componentsLink-anchor">Open in Discover</a></p>'
    );
    expect(resolveKibanaPath).toHaveBeenCalledWith(`/app/discover${discover.path}`);
  });

  it('links an app by its route on every host, not by its app id', () => {
    const security: LinkNode = { type: 'link', label: 'Alerts', app: 'security', path: '/alerts' };

    expect(react(security, { resolveKibanaPath: (path) => `/base${path}` })).toContain(
      'href="/base/app/security/alerts"'
    );
    expect(slack(security, 'https://kibana.example.com/base')).toEqual([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '<https://kibana.example.com/base/app/security/alerts|Alerts>',
        },
      },
    ]);
  });

  it('renders nothing in React when the app link does not resolve', () => {
    expect(react(discover)).toBe('');
    expect(react(discover, { resolveKibanaPath: () => undefined })).toBe('');
    expect(react(discover, { resolveKibanaPath: () => 'data:text/html,<b>hi</b>' })).toBe('');
  });

  it('links an absolute URL in React with no resolver', () => {
    expect(react(docs)).toBe(
      `<p class="componentsLink-root"><a href="${DOCS}" class="componentsLink-anchor">Docs</a></p>`
    );
  });

  it('renders absolute URLs in text and Markdown, and app links as nothing', () => {
    expect(surfaces.text.renderNode(docs)).toBe(`Docs: ${DOCS}`);
    expect(surfaces.markdown.renderNode(docs)).toBe(`[Docs](${DOCS})`);
    expect(surfaces.text.renderNode(discover)).toBe('');
    expect(surfaces.markdown.renderNode(discover)).toBe('');
  });

  it('is authored from its text children', () => {
    expect(
      toComposition(
        <Composition>
          <Link app="discover" path={discover.path}>
            Open in Discover
          </Link>
        </Composition>
      ).body
    ).toEqual([discover]);
  });
});
