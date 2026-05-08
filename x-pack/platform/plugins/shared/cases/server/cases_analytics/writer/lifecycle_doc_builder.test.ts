/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { CASE_SAVED_OBJECT, CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import { CasePersistedSeverity, CasePersistedStatus } from '../../common/types/case';
import type { UserActionPersistedAttributes } from '../../common/types/user_actions';
import { buildLifecycleDoc } from './lifecycle_doc_builder';

const NOW = '2026-05-07T12:00:00.000Z';
const fixedNow = () => NOW;

const baseCaseSO = (
  overrides: Partial<CasePersistedAttributes> = {}
): SavedObject<CasePersistedAttributes> =>
  ({
    type: CASE_SAVED_OBJECT,
    id: 'case-1',
    namespaces: ['default'],
    references: [],
    attributes: {
      owner: 'securitySolution',
      title: 't',
      description: 'd',
      tags: [],
      assignees: [],
      severity: CasePersistedSeverity.LOW,
      status: CasePersistedStatus.OPEN,
      created_at: '2026-05-01T00:00:00.000Z',
      created_by: { username: 'u' },
      total_alerts: 0,
      total_comments: 0,
      ...overrides,
    } as unknown as CasePersistedAttributes,
  } as SavedObject<CasePersistedAttributes>);

const userAction = (
  type: string,
  action: string,
  createdAt: string
): SavedObject<UserActionPersistedAttributes> => ({
  type: CASE_USER_ACTION_SAVED_OBJECT,
  id: `ua-${type}-${action}-${createdAt}`,
  namespaces: ['default'],
  references: [{ type: CASE_SAVED_OBJECT, id: 'case-1', name: 'associated-cases' }],
  attributes: {
    owner: 'securitySolution',
    action,
    type,
    payload: {},
    created_at: createdAt,
    created_by: {},
  } as unknown as UserActionPersistedAttributes,
});

describe('buildLifecycleDoc', () => {
  describe('open cases', () => {
    it('does not emit closed_at, time_to_close_ms, or time_open_ms', () => {
      const doc = buildLifecycleDoc(baseCaseSO(), [], fixedNow);
      expect(doc.case_lifecycle.final_status).toBe('open');
      expect(doc.case_lifecycle).not.toHaveProperty('closed_at');
      expect(doc.case_lifecycle).not.toHaveProperty('time_to_close_ms');
      expect(doc.case_lifecycle).not.toHaveProperty('time_open_ms');
    });

    it('does not emit time_to_first_response_ms when there are no comments', () => {
      const doc = buildLifecycleDoc(baseCaseSO(), [], fixedNow);
      expect(doc.case_lifecycle).not.toHaveProperty('time_to_first_response_ms');
    });

    it('emits time_to_first_response_ms based on the first comment-create action', () => {
      const doc = buildLifecycleDoc(
        baseCaseSO(),
        [
          userAction('status', 'update', '2026-05-01T00:00:30.000Z'),
          userAction('comment', 'create', '2026-05-01T00:01:00.000Z'),
          userAction('comment', 'create', '2026-05-01T00:02:00.000Z'),
        ],
        fixedNow
      );
      // First comment is +60s after creation.
      expect(doc.case_lifecycle.time_to_first_response_ms).toBe(60_000);
    });
  });

  describe('reopened-but-still-open cases', () => {
    it('does NOT leak a stale closed_at or time_to_close_ms', () => {
      // SO that was previously closed and is now open again, but with a stale
      // `closed_at` lingering from the prior cycle. The reducer must not emit
      // those fields — that's the bug C3 fixes.
      const so = baseCaseSO({
        status: CasePersistedStatus.OPEN,
        closed_at: '2026-05-02T00:00:00.000Z' as unknown as string,
      });
      const doc = buildLifecycleDoc(so, [], fixedNow);
      expect(doc.case_lifecycle.final_status).toBe('open');
      expect(doc.case_lifecycle).not.toHaveProperty('closed_at');
      expect(doc.case_lifecycle).not.toHaveProperty('time_to_close_ms');
      expect(doc.case_lifecycle).not.toHaveProperty('time_open_ms');
    });
  });

  describe('closed cases', () => {
    it('emits closed_at, time_to_close_ms, and time_open_ms (all consistent)', () => {
      const so = baseCaseSO({
        status: CasePersistedStatus.CLOSED,
        closed_at: '2026-05-03T00:00:00.000Z' as unknown as string,
      });
      const doc = buildLifecycleDoc(so, [], fixedNow);
      expect(doc.case_lifecycle.final_status).toBe('closed');
      expect(doc.case_lifecycle.closed_at).toBe('2026-05-03T00:00:00.000Z');
      // 2 days = 172_800_000 ms.
      expect(doc.case_lifecycle.time_to_close_ms).toBe(172_800_000);
      expect(doc.case_lifecycle.time_open_ms).toBe(172_800_000);
    });
  });

  describe('total_comments', () => {
    it('uses the SO attribute as the canonical source', () => {
      // SO says 7 comments. Activity scan would count 0 comment-create
      // actions (none provided). Output must trust the SO.
      const so = baseCaseSO({ total_comments: 7 } as unknown as Partial<CasePersistedAttributes>);
      const doc = buildLifecycleDoc(so, [], fixedNow);
      expect(doc.case_lifecycle.total_comments).toBe(7);
    });

    it('defaults to 0 when the SO attribute is missing', () => {
      const so = baseCaseSO();
      // @ts-expect-error force-clear the attribute
      delete so.attributes.total_comments;
      const doc = buildLifecycleDoc(so, [], fixedNow);
      expect(doc.case_lifecycle.total_comments).toBe(0);
    });
  });

  describe('counters that come from the activity scan', () => {
    it('counts assignee + status changes from the activity history', () => {
      const doc = buildLifecycleDoc(
        baseCaseSO(),
        [
          userAction('assignees', 'update', '2026-05-01T00:00:30.000Z'),
          userAction('assignees', 'update', '2026-05-01T00:01:00.000Z'),
          userAction('status', 'update', '2026-05-02T00:00:00.000Z'),
        ],
        fixedNow
      );
      expect(doc.case_lifecycle.total_assignee_changes).toBe(2);
      expect(doc.case_lifecycle.total_status_changes).toBe(1);
    });
  });
});
