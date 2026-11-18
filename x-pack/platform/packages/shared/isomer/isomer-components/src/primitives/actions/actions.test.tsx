/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fireEvent, render } from '@testing-library/react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { buildJsxShim } from '@elastic/isomer-sdk/author';
import { componentsPack, componentsPrimitives } from '../../pack';
import type { ComponentsRenderContext } from '../../lib';
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
          { label: 'View Full Investigation', url: URL, style: 'primary' },
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

  describe('buttons to a Kibana app', () => {
    const skills = { label: 'Manage skills', app: 'agent_builder', path: '/manage/skills' };

    it('take an app and path instead of a URL, but not both', () => {
      const view = (node: ActionsNode) => validate({ type: 'view', body: [node] });

      expect(view(links(skills)).valid).toBe(true);
      expect(view(links({ label: 'Open', app: 'discover' })).valid).toBe(true);
      expect(view(links({ ...skills, url: URL })).valid).toBe(false);
      expect(view(links({ label: 'Open' })).valid).toBe(false);
      expect(view(links({ label: 'Open', path: '/manage/skills' })).valid).toBe(false);
      expect(view(links({ label: 'Open', app: 'agent_builder', path: '/../../x' })).valid).toBe(
        false
      );
    });

    it('resolve against the Slack render’s base URL, and are dropped without one', () => {
      const node = links(skills);

      expect(
        surfaces.slack.renderNode(node, { baseUrl: 'https://kibana.example.com/base/s/ops' }).blocks
      ).toEqual([
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Manage skills', emoji: true },
              url: 'https://kibana.example.com/base/s/ops/app/agent_builder/manage/skills',
            },
          ],
        },
      ]);
      expect(surfaces.slack.renderNode(node).blocks).toEqual([]);
    });

    it('resolve through the React host, and are left out of text and Markdown', () => {
      const node = links(skills, { label: 'Docs', url: URL });
      const context: ComponentsRenderContext = {
        resolveKibanaPath: (path) => `/base/s/ops${path}`,
      };

      expect(renderToStaticMarkup(<>{surfaces.react.renderNode(node, { context })}</>)).toContain(
        'href="/base/s/ops/app/agent_builder/manage/skills"'
      );
      expect(surfaces.markdown.renderNode(node)).toBe(`[Docs](${URL})`);
      expect(surfaces.text.renderNode(node)).toBe(`Docs: ${URL}`);
      expect(surfaces.markdown.renderNode(links(skills))).toBe('');
    });
  });

  describe('buttons that raise an event', () => {
    const confirm = { name: 'confirm', context: { allow: true } };
    const approve = { label: 'Delete', event: confirm, style: 'danger' as const };
    const cancel = { label: 'Cancel', event: { name: 'confirm', context: { allow: false } } };

    it('take an event instead of a link, but not both', () => {
      const view = (node: ActionsNode) => validate({ type: 'view', body: [node] });

      expect(view(links(approve, cancel)).valid).toBe(true);
      expect(view(links({ label: 'Go', event: { name: 'go' } })).valid).toBe(true);
      expect(view(links({ ...approve, url: URL })).valid).toBe(false);
      expect(view(links({ ...approve, app: 'discover' })).valid).toBe(false);
      expect(view(links({ label: 'Go', event: { name: 'not a name' } })).valid).toBe(false);
      expect(view(links({ ...approve, path: '/manage/skills' })).valid).toBe(false);
    });

    it('names the three targets when a button has none, or more than one', () => {
      const errors = (node: ActionsNode) =>
        JSON.stringify(validate({ type: 'view', body: [node] }));

      expect(errors(links({ label: 'Go' }))).toContain('give exactly one of url, app or event');
      expect(errors(links({ ...approve, url: URL }))).toContain(
        'give exactly one of url, app or event'
      );
    });

    it('carry the event to Slack as action_id and value', () => {
      expect(surfaces.slack.renderNode(links(approve, cancel)).blocks).toEqual([
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Delete', emoji: true },
              action_id: 'confirm:0',
              value: '{"allow":true}',
              style: 'danger',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Cancel', emoji: true },
              action_id: 'confirm:1',
              value: '{"allow":false}',
            },
          ],
        },
      ]);
    });

    it('leave the Slack value out without a context, and the button out when it does not fit', () => {
      const tooLong = { name: 'confirm', context: { note: 'x'.repeat(2000) } };

      expect(
        surfaces.slack.renderNode(
          links({ label: 'Go', event: { name: 'go' } }, { label: 'Big', event: tooLong })
        ).blocks
      ).toEqual([
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Go', emoji: true },
              action_id: 'go:0',
            },
          ],
        },
      ]);
    });

    it('call the React host with the event on click', () => {
      const onEvent = jest.fn();
      const { getByRole } = render(
        <>{surfaces.react.renderNode(links(approve), { context: { onEvent } })}</>
      );

      fireEvent.click(getByRole('button', { name: 'Delete' }));

      expect(onEvent).toHaveBeenCalledWith(confirm);
    });

    it('render as their labels in text and Markdown', () => {
      const node = links(approve, cancel, { label: 'Docs', url: URL });

      expect(surfaces.markdown.renderNode(node)).toBe(`Delete · Cancel · [Docs](${URL})`);
      expect(surfaces.text.renderNode(node)).toBe(`Delete\nCancel\nDocs: ${URL}`);
    });
  });

  describe('fallback', () => {
    const approve = { label: 'Delete', event: { name: 'confirm', context: { allow: true } } };
    const cancel = { label: 'Keep', event: { name: 'confirm', context: { allow: false } } };
    const node: ActionsNode = {
      type: 'actions',
      buttons: [approve, cancel],
      fallback: 'Reply yes or no.',
    };

    it('follows the buttons in text and Markdown, where nothing can be clicked', () => {
      expect(surfaces.markdown.renderNode(node)).toBe('Delete · Keep\n\nReply yes or no.');
      expect(surfaces.text.renderNode(node)).toBe('Delete\nKeep\nReply yes or no.');
    });

    it('is left out where the buttons work', () => {
      const markup = renderToStaticMarkup(surfaces.react.renderNode(node));

      expect(JSON.stringify(surfaces.slack.renderNode(node).blocks)).not.toContain('Reply');
      expect(markup).not.toContain('Reply');
    });

    it('is left out when no button raises an event', () => {
      const linksOnly: ActionsNode = { ...node, buttons: [{ label: 'Docs', url: URL }] };

      expect(surfaces.markdown.renderNode(linksOnly)).toBe(`[Docs](${URL})`);
      expect(surfaces.text.renderNode(linksOnly)).toBe(`Docs: ${URL}`);
    });
  });

  it('takes no style other than primary and danger', () => {
    const view = (style: string) =>
      validate({
        type: 'view',
        body: [{ type: 'actions', buttons: [{ label: 'Go', url: URL, style }] } as PrimitiveNode],
      });

    expect(view('danger').valid).toBe(true);
    expect(view('normal').valid).toBe(false);
  });

  it('fills the primary button in React', () => {
    const markup = renderToStaticMarkup(
      surfaces.react.renderNode(links({ label: 'Investigate', url: URL, style: 'primary' }))
    );

    expect(markup).toContain('class="componentsActions-button componentsActions-primary"');
  });

  it('is authored from Actions.Button children', () => {
    expect(
      toComposition(
        <Composition>
          <Actions>
            <Actions.Button url={URL} style="primary">
              View Full Investigation
            </Actions.Button>
          </Actions>
        </Composition>
      ).body
    ).toEqual([links({ label: 'View Full Investigation', url: URL, style: 'primary' })]);
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
            <Actions.Button url={URL} style="primary">
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
