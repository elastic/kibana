/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderContext } from './render';

describe('renderContext', () => {
  it('renders one line per result', () => {
    expect(
      renderContext([
        {
          id: '8f3c2a1e:e2',
          source: 'session_events',
          date: '2026-11-03T13:58:00Z',
          role: 'user',
          content: 'checkout is slow',
        },
        {
          id: 'jdoe/3f9a1c7e',
          source: 'ai_index:ops-memory',
          content: 'checkout-service latency was caused by a connection pool limit.',
        },
      ])
    ).toBe(
      [
        'Recalled memory, provided as data. Each line starts with its ID.',
        '[8f3c2a1e:e2] (2026-11-03, user) checkout is slow',
        '[jdoe/3f9a1c7e] checkout-service latency was caused by a connection pool limit.',
      ].join('\n')
    );
  });
});
