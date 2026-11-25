/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CARD_ATTACHMENT_TYPE } from '../../common/attachments';
import { createCardAttachmentType } from './card';
import { renderSurface, surfaceContext } from './test_utils';

const card = {
  title: 'Checkout errors',
  subtitle: 'Last 15 minutes',
  body: [
    {
      type: 'fields',
      items: [
        { label: 'Service', value: 'checkout' },
        { label: 'Env', value: 'production' },
      ],
    },
    {
      type: 'table',
      columns: [{ label: 'Endpoint' }, { label: 'Errors', align: 'right' }],
      rows: [
        ['/cart', 1284],
        ['/pay', null],
      ],
    },
    { type: 'code', text: 'FROM logs-* | STATS count() BY service.name', language: 'esql' },
    {
      type: 'actions',
      buttons: [{ label: 'Open in Discover', app: 'discover', style: 'primary' }],
    },
  ],
};

describe('card attachment type', () => {
  const type = createCardAttachmentType();

  it('renders the whole card as Slack blocks', async () => {
    const parsed = await type.validate(card);
    if (!parsed.valid) throw new Error(parsed.error);

    const composition = await type.toSurfaceComposition?.(
      { id: 'card-1', type: CARD_ATTACHMENT_TYPE, data: parsed.data },
      surfaceContext
    );
    const { valid, errors, slack } = await renderSurface(composition);

    expect(errors).toEqual([]);
    expect(valid).toBe(true);
    expect(JSON.parse(slack).map(({ type: blockType }: { type: string }) => blockType)).toEqual(
      expect.arrayContaining(['section', 'table', 'rich_text', 'actions'])
    );
  });

  it.each([
    ['an empty body', { body: [] }],
    ['an unknown node type', { body: [{ type: 'chart', series: [] }] }],
    [
      'a button with neither url nor app',
      { body: [{ type: 'actions', buttons: [{ label: 'x' }] }] },
    ],
    [
      'a table row with fewer cells than columns',
      { body: [{ type: 'table', columns: [{ label: 'a' }, { label: 'b' }], rows: [['x']] }] },
    ],
    [
      'a button with a path but no app',
      { body: [{ type: 'actions', buttons: [{ label: 'x', url: 'https://a.b', path: '/p' }] }] },
    ],
    [
      'a button that raises an event',
      { body: [{ type: 'actions', buttons: [{ label: 'x', event: { name: 'confirm' } }] }] },
    ],
    [
      'a button with the old primary flag',
      { body: [{ type: 'actions', buttons: [{ label: 'x', url: 'https://a.b', primary: true }] }] },
    ],
    [
      'six buttons',
      { body: [{ type: 'actions', buttons: Array(6).fill({ label: 'x', url: 'https://a.b' }) }] },
    ],
  ])('refuses %s', async (_name, data) => {
    expect((await type.validate(data)).valid).toBe(false);
  });
});
