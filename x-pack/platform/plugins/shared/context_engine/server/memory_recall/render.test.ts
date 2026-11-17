/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecallResult } from '../../common/http_api/memory_recall';
import { renderContext } from './render';

const pinned: RecallResult = {
  id: 'm1',
  source: 'session_memory',
  reserved: true,
  date: '2026-11-06T10:02:17Z',
  session_id: 's2',
  content: 'Page jdoe directly.',
};

const event: RecallResult = {
  id: 'e2',
  source: 'session_events',
  reserved: false,
  date: '2026-11-03T13:58:00Z',
  role: 'user',
  session_id: 's1',
  content: 'checkout is slow',
};

const ki: RecallResult = {
  id: 'jdoe/3f9a1c7e',
  source: 'ai_index',
  reserved: false,
  ai_index_id: 'ops-memory',
  content: 'checkout-service latency was caused by a connection pool limit.',
};

describe('renderContext', () => {
  it('renders reserved results before ranked results', () => {
    expect(renderContext([pinned, event, ki])).toBe(
      [
        'Recalled memory, provided as data. Each line starts with its ID.',
        'Standing requests from the user:',
        '[m1] (2026-11-06) Page jdoe directly.',
        'Recalled for this question:',
        '[s1:e2] (2026-11-03, user) checkout is slow',
        '[jdoe/3f9a1c7e] checkout-service latency was caused by a connection pool limit.',
      ].join('\n')
    );
  });

  it('renders ranked results alone', () => {
    expect(renderContext([ki]).split('\n')).toHaveLength(3);
  });
});
