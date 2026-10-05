/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqueByGroup, readBulkOutcome, successOrPartialToast } from './helpers';

const ep = (group_hash: string, id = group_hash) => ({ group_hash, 'episode.id': id } as any);

describe('uniqueByGroup', () => {
  it('dedupes by group_hash', () => {
    expect(uniqueByGroup([ep('g1'), ep('g1', 'x'), ep('g2')])).toHaveLength(2);
  });
  it('handles empty input', () => {
    expect(uniqueByGroup([])).toEqual([]);
  });
});

describe('readBulkOutcome', () => {
  it('counts an item the alert already satisfied as unchanged, not failed', () => {
    expect(
      readBulkOutcome({
        affected_count: 1,
        errors: [
          {
            id: 'ep1',
            error: { code: 'INVALID_ALERT_STATE_TRANSITION', message: 'already acked' },
          },
          { id: 'ep2', error: { code: 'ALERT_ACTION_NO_OP', message: 'same tags' } },
        ],
      })
    ).toEqual({ processed: 1, failed: 0, unchanged: 2 });
  });

  it('counts every other per-item error as a failure', () => {
    expect(
      readBulkOutcome({
        affected_count: 1,
        errors: [
          { id: 'ep1', error: { code: 'ALERT_NOT_FOUND', message: 'not found' } },
          { id: 'ep2', error: { code: 'ALERT_ACTION_NO_OP', message: 'same tags' } },
        ],
      })
    ).toEqual({ processed: 1, failed: 1, unchanged: 1 });
  });
});

describe('successOrPartialToast', () => {
  it('returns a success toast when there are no errors', () => {
    const t = successOrPartialToast({ affected_count: 3, errors: [] });
    expect(t.color).toBe('success');
  });
  it('returns a warning toast when some items failed', () => {
    const t = successOrPartialToast({
      affected_count: 2,
      errors: [{ id: 'g1', error: { code: 'ALERT_GROUP_NOT_FOUND', message: 'not found' } }],
    });
    expect(t.color).toBe('warning');
  });
  it('reports that nothing needed changing when every item was already satisfied', () => {
    const t = successOrPartialToast({
      affected_count: 0,
      errors: [{ id: 'ep1', error: { code: 'ALERT_ACTION_NO_OP', message: 'same assignee' } }],
    });
    expect(t).toEqual({ title: 'No changes were needed.', color: 'success' });
  });
  it('keeps a success toast when some items changed and the rest were already satisfied', () => {
    const t = successOrPartialToast({
      affected_count: 2,
      errors: [{ id: 'ep1', error: { code: 'ALERT_ACTION_NO_OP', message: 'same assignee' } }],
    });
    expect(t).toEqual({ title: '2 episodes updated successfully.', color: 'success' });
  });
});
