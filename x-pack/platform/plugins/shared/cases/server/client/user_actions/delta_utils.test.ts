/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_DELTA_ITEMS } from '../../../common/types/api';
import { summarizeDelta } from './delta_utils';
import type { DeltaUserAction } from './delta_utils';

const me = { username: 'me', full_name: null, email: null, profile_uid: 'u_me' };
const sam = { username: 'sam', full_name: 'Sam Analyst', email: null, profile_uid: 'u_sam' };

let nextId = 0;
const userAction = (overrides: Partial<DeltaUserAction> = {}): DeltaUserAction => ({
  id: `ua-${nextId++}`,
  created_at: '2026-11-20T10:00:00.000Z',
  type: 'status',
  action: 'update',
  created_by: sam,
  ...overrides,
});

const counts = (userActions: DeltaUserAction[]) => summarizeDelta(userActions, me).counts;
const items = (userActions: DeltaUserAction[]) => summarizeDelta(userActions, me).items;

describe('summarizeDelta counts', () => {
  it('returns zero counts for no user actions', () => {
    expect(counts([])).toEqual({ alerts: 0, comments: 0, changes: 0, evidence: 0 });
  });

  it('counts each category', () => {
    expect(
      counts([
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
      ])
    ).toEqual({ alerts: 1, comments: 1, changes: 2, evidence: 2 });
  });

  it('counts comment edits and deletions as changes', () => {
    expect(
      counts([
        userAction({ type: 'comment', action: 'update', payload: { comment: { type: 'user' } } }),
        userAction({ type: 'comment', action: 'delete', payload: { comment: { type: 'user' } } }),
      ])
    ).toEqual({ alerts: 0, comments: 0, changes: 2, evidence: 0 });
  });

  it('ignores the case creation', () => {
    expect(counts([userAction({ type: 'create_case', action: 'create' })]).changes).toBe(0);
  });

  it('ignores actions by the current user matched by profile uid', () => {
    expect(counts([userAction({ created_by: me })]).changes).toBe(0);
  });

  it('matches the current user by username when a profile uid is missing', () => {
    const noProfile = { ...me, profile_uid: undefined };
    const own = userAction({ created_by: { ...me, profile_uid: undefined } });

    expect(summarizeDelta([own], noProfile).counts.changes).toBe(0);
  });
});

describe('summarizeDelta items', () => {
  it('lists the newest items first', () => {
    const result = items([
      userAction({ id: 'old', created_at: '2026-11-20T09:00:00.000Z' }),
      userAction({ id: 'new', created_at: '2026-11-20T11:00:00.000Z' }),
    ]);

    expect(result.map(({ id }) => id)).toEqual(['new', 'old']);
  });

  it('keeps only the newest items but counts all of them', () => {
    const many = Array.from({ length: MAX_DELTA_ITEMS + 5 }, () => userAction());
    const result = summarizeDelta(many, me);

    expect(result.items).toHaveLength(MAX_DELTA_ITEMS);
    expect(result.counts.changes).toBe(MAX_DELTA_ITEMS + 5);
  });

  it('uses the full name of the author and falls back to the username', () => {
    const result = items([
      userAction({ created_by: sam }),
      userAction({ created_by: { ...sam, full_name: null } }),
    ]);

    expect(result.map(({ author }) => author)).toEqual(['Sam Analyst', 'sam']);
  });

  it.each([
    ['the new status', { type: 'status', payload: { status: 'in-progress' } }, 'in-progress'],
    ['the new severity', { type: 'severity', payload: { severity: 'high' } }, 'high'],
    [
      'the rule name of an alert',
      {
        type: 'comment',
        action: 'create',
        payload: { comment: { type: 'alert', rule: { name: 'Cred dump' } } },
      },
      'Cred dump',
    ],
    [
      'the file name',
      {
        type: 'comment',
        action: 'create',
        payload: {
          comment: {
            type: 'externalReference',
            externalReferenceAttachmentTypeId: '.files',
            externalReferenceMetadata: { files: [{ name: 'memdump' }] },
          },
        },
      },
      'memdump',
    ],
    [
      'the observable action type',
      { type: 'observables', payload: { observables: { count: 2, actionType: 'add' } } },
      'add',
    ],
  ])('reads %s as the detail', (_, overrides, detail) => {
    expect(items([userAction(overrides)])[0].detail).toBe(detail);
  });

  it('has no detail for a user comment', () => {
    const [item] = items([
      userAction({ type: 'comment', action: 'create', payload: { comment: { type: 'user' } } }),
    ]);

    expect(item.detail).toBeNull();
  });

  it('reads the number of observables', () => {
    const [item] = items([
      userAction({
        type: 'observables',
        payload: { observables: { count: 8, actionType: 'add' } },
      }),
    ]);

    expect(item.count).toBe(8);
  });
});
