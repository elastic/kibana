/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slackSurface } from './slack';

describe('slackSurface', () => {
  it('renders the composition as Block Kit', () => {
    const composition = {
      type: 'view' as const,
      body: [{ type: 'markdown' as const, text: 'There are **3** [alerts](https://example.com).' }],
    };

    expect(slackSurface.render(composition)).toEqual({
      text: expect.any(String),
      blocks: [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                { type: 'text', text: 'There are ' },
                { type: 'text', text: '3', style: { bold: true } },
                { type: 'text', text: ' ' },
                { type: 'link', text: 'alerts', url: 'https://example.com' },
                { type: 'text', text: '.' },
              ],
            },
          ],
        },
      ],
    });
  });
});
