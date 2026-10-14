/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqueBySeries, readBulkOutcome, successOrPartialToast } from './helpers';

const ep = (series_id: string | null | undefined, id = 'e', group_hash = 'g1') =>
  ({ series_id, group_hash, 'episode.id': id } as any);

describe('uniqueBySeries', () => {
  it('dedupes by series_id', () => {
    expect(uniqueBySeries([ep('s1'), ep('s1', 'x'), ep('s2')])).toHaveLength(2);
  });
  it('keeps episodes of different series that share a group_hash', () => {
    const rows = uniqueBySeries([ep('s1', 'a', 'shared'), ep('s2', 'b', 'shared')]);
    expect(rows.map((row) => row.series_id)).toEqual(['s1', 's2']);
  });
  it('drops episodes without a series_id', () => {
    expect(uniqueBySeries([ep(null), ep(undefined), ep('s1')])).toHaveLength(1);
  });
  it('handles empty input', () => {
    expect(uniqueBySeries([])).toEqual([]);
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
    expect(t).toEqual({ title: '2 alerts updated successfully.', color: 'success' });
  });
});
