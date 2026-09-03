/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Improvement } from '../../../../common/http_api/improvements';

/** Test-only factory for an improvement, defaulting to a suggested `add_ki`. */
export const buildImprovement = (overrides: Partial<Improvement> = {}): Improvement => ({
  improvement_id: 'imp-1',
  revision_id: 'rev-1',
  latest: true,
  ai_index_id: 'my-ai-index',
  '@timestamp': '2026-08-20T09:00:00.000Z',
  status: 'suggested',
  suggested_at: '2026-08-20T09:00:00.000Z',
  action: 'add_ki',
  title: 'Document the refund window',
  rationale: 'Three unanswered questions in the window mentioned refunds.',
  payload: {
    ki: { type: 'document', title: 'Refund window', content: 'Refunds are accepted for 30 days.' },
  },
  provenance: {
    agent_run_id: 'run-1',
    signal_ids: ['sig-1', 'sig-2', 'sig-3'],
    signal_spaces: ['default'],
    signal_window: { from: 'now-30d', to: 'now' },
    signal_count: 3,
    tags: ['coverage_gap'],
  },
  ...overrides,
});
