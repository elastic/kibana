/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqueBySeries, readBulkOutcome, createBulkActionError } from './helpers';

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
    ).toEqual({ processed: 1, failed: 0, unchanged: 2, errors: [] });
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
    ).toEqual({
      processed: 1,
      failed: 1,
      unchanged: 1,
      errors: [{ id: 'ep1', error: { code: 'ALERT_NOT_FOUND', message: 'not found' } }],
    });
  });
});

describe('createBulkActionError', () => {
  it('keeps every alert id and API reason in the full error details', () => {
    const error = createBulkActionError(
      [
        { id: 'ep1', message: 'Alert not found' },
        { id: 'ep2', message: 'Action is not allowed' },
      ],
      2
    );

    expect(error.message).toBe('The action failed for 2 alerts.');
    expect(error.stack).toBe('ep1 — Alert not found\nep2 — Action is not allowed');
  });

  it('uses the affected count when one detail describes several failures', () => {
    const error = createBulkActionError([{ message: 'Index is unavailable' }], 3);

    expect(error.message).toBe('The action failed for 3 alerts.');
    expect(error.stack).toBe('Index is unavailable');
  });
});
