/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { buildAlertEventRecord, buildHandlerItem } from '../test_utils';
import { assignHandler } from './assign';

const buildItem = (requested: string | null, current: string | null) =>
  buildHandlerItem(
    { action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN, assignee_uid: requested } as const,
    buildAlertEventRecord(),
    { actionState: { assignee_uid: current } }
  );

describe('assignHandler', () => {
  it('declares that it needs the alert action state', () => {
    expect(assignHandler.requiresActionState).toBe(true);
  });

  it('forwards the precomputed audit doc when the assignee changes', () => {
    const item = buildItem('user-2', 'user-1');
    const prepared = assignHandler.prepare(item);

    expect(prepared.alertActionDoc).toBe(item.alertActionDoc);
  });

  it('accepts assigning an unassigned alert', () => {
    expect(() => assignHandler.prepare(buildItem('user-1', null))).not.toThrow();
  });

  it('accepts clearing the assignee of an assigned alert', () => {
    expect(() => assignHandler.prepare(buildItem(null, 'user-1'))).not.toThrow();
  });

  it('rejects assigning the current assignee with a 409 ALERT_ACTION_NO_OP', () => {
    expect(() => assignHandler.prepare(buildItem('user-1', 'user-1'))).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 409 }),
        data: {
          code: 'ALERT_ACTION_NO_OP',
          details: {
            group_hash: 'group-1',
            alert_id: 'episode-1',
            action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
          },
        },
      })
    );
  });

  it('rejects clearing the assignee of an unassigned alert', () => {
    expect(() => assignHandler.prepare(buildItem(null, null))).toThrow(
      expect.objectContaining({
        message: '[episode-1] has no assignee.',
      })
    );
  });
});
