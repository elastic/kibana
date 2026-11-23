/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countDelta } from './delta_utils';
import type { DeltaUserAction } from './delta_utils';

const me = { username: 'me', full_name: null, email: null, profile_uid: 'u_me' };
const sam = { username: 'sam', full_name: null, email: null, profile_uid: 'u_sam' };

const userAction = (overrides: Partial<DeltaUserAction> = {}): DeltaUserAction => ({
  type: 'status',
  action: 'update',
  created_by: sam,
  ...overrides,
});

describe('countDelta', () => {
  it('returns zero counts for no user actions', () => {
    expect(countDelta([], me)).toEqual({ alerts: 0, comments: 0, changes: 0, evidence: 0 });
  });

  it('counts each category', () => {
    const counts = countDelta(
      [
        userAction({ type: 'comment', action: 'create', payload: { comment: { type: 'user' } } }),
        userAction({ type: 'comment', action: 'create', payload: { comment: { type: 'alert' } } }),
        userAction({
          type: 'comment',
          action: 'create',
          payload: {
            comment: { type: 'externalReference', externalReferenceAttachmentTypeId: '.files' },
          },
        }),
        userAction({ type: 'observables' }),
        userAction({ type: 'status' }),
        userAction({ type: 'severity' }),
      ],
      me
    );

    expect(counts).toEqual({ alerts: 1, comments: 1, changes: 2, evidence: 2 });
  });

  it('counts comment edits and deletions as changes', () => {
    const counts = countDelta(
      [
        userAction({ type: 'comment', action: 'update', payload: { comment: { type: 'user' } } }),
        userAction({ type: 'comment', action: 'delete', payload: { comment: { type: 'user' } } }),
      ],
      me
    );

    expect(counts).toEqual({ alerts: 0, comments: 0, changes: 2, evidence: 0 });
  });

  it('ignores the case creation', () => {
    expect(countDelta([userAction({ type: 'create_case', action: 'create' })], me).changes).toBe(0);
  });

  it('ignores actions by the current user matched by profile uid', () => {
    expect(countDelta([userAction({ created_by: me })], me).changes).toBe(0);
  });

  it('matches the current user by username when a profile uid is missing', () => {
    const noProfile = { ...me, profile_uid: undefined };

    expect(
      countDelta([userAction({ created_by: { ...me, profile_uid: undefined } })], noProfile)
    ).toEqual({ alerts: 0, comments: 0, changes: 0, evidence: 0 });
  });
});
