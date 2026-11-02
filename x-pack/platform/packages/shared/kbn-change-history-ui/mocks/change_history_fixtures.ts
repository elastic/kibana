/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeHistoryDetail } from '../src/types/change_history_detail';

export const MOCK_CHANGE_HISTORY_OBJECT_ID = 'example-object-1';

export const createMockChangeHistoryDetails = (): ChangeHistoryDetail[] => [
  {
    id: 'evt-current',
    timestamp: '2026-06-16T12:00:00.000Z',
    actor: { name: 'Alice', profileId: 'user-alice' },
    action: 'Updated',
    comment: 'Adjusted trigger threshold',
    isCurrent: true,
    metadata: { version: 3 },
    snapshot: { name: 'example', version: 3, steps: ['notify', 'close'] },
  },
  {
    id: 'evt-2',
    timestamp: '2026-06-15T10:30:00.000Z',
    actor: { name: 'Bob', profileId: 'user-bob' },
    action: 'Updated',
    changes: { count: 2, summary: [{ label: 'Steps', count: 1 }] },
    metadata: { version: 2 },
    snapshot: { name: 'example', version: 2, steps: ['notify'] },
  },
  {
    id: 'evt-1',
    timestamp: '2026-06-14T08:00:00.000Z',
    actor: { name: 'Alice', profileId: 'user-alice' },
    action: 'Created',
    metadata: { version: 1 },
    snapshot: { name: 'example', version: 1, steps: [] },
  },
];
