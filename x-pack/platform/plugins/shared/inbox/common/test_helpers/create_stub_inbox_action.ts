/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InboxAction } from '@kbn/inbox-common';

const DEFAULT_STUB: InboxAction = {
  id: 'stub-action-001',
  title: 'Approve stub action',
  description: 'Short human-readable description of what needs approval.',
  status: 'pending',
  source_app: 'securitySolution',
  source_id: 'stub-source-1',
  requested_by: 'stub-agent',
  created_at: '2026-04-24T15:00:00.000Z',
};

/**
 * Creates a deterministic `InboxAction` for use in tests. Any field can be
 * overridden to assert specific rendering/handler behavior.
 *
 * Usage:
 *   const action = createStubInboxAction({ status: 'approved', source_app: 'evals' });
 */
export const createStubInboxAction = (overrides: Partial<InboxAction> = {}): InboxAction => ({
  ...DEFAULT_STUB,
  ...overrides,
});

/**
 * Creates an array of `count` stub actions with sequential ids, useful for
 * asserting pagination behavior in list endpoints and table components.
 */
export const createStubInboxActions = (
  count: number,
  overrides: Partial<InboxAction> = {}
): InboxAction[] =>
  Array.from({ length: count }, (_, i) =>
    createStubInboxAction({
      id: `stub-action-${String(i + 1).padStart(3, '0')}`,
      source_id: `stub-source-${i + 1}`,
      ...overrides,
    })
  );
