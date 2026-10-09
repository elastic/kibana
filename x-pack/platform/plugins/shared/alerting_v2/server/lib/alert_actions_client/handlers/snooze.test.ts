/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import type { SeriesActionState } from '../context_loaders/load_series_action_states';
import { buildAlertEventRecord, buildHandlerItem } from '../test_utils';
import { snoozeHandler } from './snooze';

const UNTIL = '2030-01-01T00:00:00.000Z';

const buildItem = (requestedUntil: string | undefined, current: SeriesActionState) =>
  buildHandlerItem(
    { action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE, snoozed_until: requestedUntil } as const,
    buildAlertEventRecord(),
    { seriesActionState: current }
  );

describe('snoozeHandler', () => {
  it.each([
    ['a later expiry', '2031-01-01T00:00:00.000Z', UNTIL],
    ['an earlier expiry', '2029-01-01T00:00:00.000Z', UNTIL],
    ['an expiry on an indefinite snooze', UNTIL, null],
    ['an indefinite snooze on a timed one', undefined, UNTIL],
  ])('accepts %s', (_, requestedUntil, currentUntil) => {
    expect(() =>
      snoozeHandler.prepare(
        buildItem(requestedUntil, { snoozed: true, snoozed_until: currentUntil })
      )
    ).not.toThrow();
  });

  it('rejects the expiry already in effect with a 409 ALERT_ACTION_NO_OP', () => {
    expect(() =>
      snoozeHandler.prepare(buildItem(UNTIL, { snoozed: true, snoozed_until: UNTIL }))
    ).toThrow(
      expect.objectContaining({
        message: `[group-1] is already snoozed until [${UNTIL}].`,
        output: expect.objectContaining({ statusCode: 409 }),
        data: {
          code: 'ALERT_ACTION_NO_OP',
          // Series-scoped: keyed by group_hash, no alert_id.
          details: { group_hash: 'group-1', action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE },
        },
      })
    );
  });

  it('compares expiries by instant, so the same time without milliseconds is still a no-op', () => {
    expect(() =>
      snoozeHandler.prepare(
        buildItem('2030-01-01T00:00:00Z', { snoozed: true, snoozed_until: UNTIL })
      )
    ).toThrow(
      expect.objectContaining({ data: expect.objectContaining({ code: 'ALERT_ACTION_NO_OP' }) })
    );
  });

  it('rejects an indefinite snooze on an indefinitely snoozed series', () => {
    expect(() =>
      snoozeHandler.prepare(buildItem(undefined, { snoozed: true, snoozed_until: null }))
    ).toThrow(expect.objectContaining({ message: '[group-1] is already snoozed indefinitely.' }));
  });
});
