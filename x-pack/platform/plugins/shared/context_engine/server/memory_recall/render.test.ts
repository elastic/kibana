/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderYaml } from './render';

describe('renderYaml', () => {
  it('renders the results as YAML', () => {
    expect(
      renderYaml([
        {
          id: 'e2',
          session_id: '8f3c2a1e',
          source: 'session_events',
          date: '2026-11-03T13:58:00Z',
          role: 'user',
          content: 'checkout is slow, can you look?',
        },
        {
          id: 'entity-service--checkout-service',
          source: 'ai_index:ops-memory',
          content: '**checkout-service**, also called checkout.\n\n- Tier 1',
          attributes: { owner: 'payments-team', tier: '1' },
        },
      ])
    ).toBe(
      [
        'results:',
        '  - id: e2',
        '    session_id: 8f3c2a1e',
        '    source: session_events',
        '    date: 2026-11-03T13:58:00Z',
        '    role: user',
        '    content: checkout is slow, can you look?',
        '  - id: entity-service--checkout-service',
        '    source: ai_index:ops-memory',
        '    content: |-',
        '      **checkout-service**, also called checkout.',
        '',
        '      - Tier 1',
        '    attributes:',
        '      owner: payments-team',
        '      tier: "1"',
        '',
      ].join('\n')
    );
  });
});
