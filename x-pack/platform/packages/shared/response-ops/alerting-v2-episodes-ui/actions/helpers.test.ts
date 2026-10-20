/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqueByGroup, readBulkOutcome, createBulkActionError } from './helpers';

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
