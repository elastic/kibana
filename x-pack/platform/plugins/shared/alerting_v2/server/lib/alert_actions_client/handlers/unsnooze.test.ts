/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { buildAlertEventRecord, buildHandlerItem } from '../test_utils';
import { unsnoozeHandler } from './unsnooze';

const buildItem = (snoozed: boolean) =>
  buildHandlerItem(
    { action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE } as const,
    buildAlertEventRecord(),
    { seriesActionState: { snoozed } }
  );

describe('unsnoozeHandler', () => {
  it('rejects a series that is not snoozed with a 409 INVALID_ALERT_STATE_TRANSITION', () => {
    expect(() => unsnoozeHandler.prepare(buildItem(false))).toThrow(
      expect.objectContaining({
        message: '[group-1] is not snoozed.',
        output: expect.objectContaining({ statusCode: 409 }),
        data: {
          code: 'INVALID_ALERT_STATE_TRANSITION',
          // Series-scoped: keyed by group_hash, no alert_id.
          details: { group_hash: 'group-1', action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE },
        },
      })
    );
  });
});
