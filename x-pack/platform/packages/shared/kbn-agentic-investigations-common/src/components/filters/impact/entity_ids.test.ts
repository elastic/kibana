/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Investigation } from '../../../types';
import { investigationEntityIds } from './entity_ids';

const investigation = (overrides: Partial<Investigation> = {}): Investigation => ({
  id: 'inv-1',
  template_id: 'investigation',
  title: 'Case',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  watch_id: '',
  watch_execution_id: '',
  pendingProposalCount: 1,
  assignees: [],
  events: [],
  ...overrides,
});

describe('investigationEntityIds', () => {
  it('prefers hydrated entity ids over affectedSurface', () => {
    expect(
      investigationEntityIds(
        investigation({ entityIds: ['user-1', 'host-1'], affectedSurface: 'legacy' })
      )
    ).toEqual(['user-1', 'host-1']);
  });

  it('falls back to affectedSurface for sample data without entity ids', () => {
    expect(investigationEntityIds(investigation({ affectedSurface: 'cfo@corp' }))).toEqual([
      'cfo@corp',
    ]);
  });

  it('returns an empty list when neither is present', () => {
    expect(investigationEntityIds(investigation())).toEqual([]);
  });
});
