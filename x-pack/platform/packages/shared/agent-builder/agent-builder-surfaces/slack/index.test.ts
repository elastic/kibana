/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slackProjection } from '.';

describe('slackProjection', () => {
  it('renders the spec as Block Kit', () => {
    const spec = {
      type: 'view' as const,
      body: [{ type: 'markdown' as const, text: 'There are **3** [alerts](https://example.com).' }],
    };

    expect(slackProjection.render(spec)).toEqual({
      text: expect.any(String),
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'There are *3* <https://example.com|alerts>.' },
        },
      ],
    });
  });
});
