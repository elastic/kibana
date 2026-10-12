/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { buildAlertEventRecord, buildHandlerItem } from '../test_utils';
import { ackHandler, unackHandler } from './ack';

const buildAckItem = (acknowledged: boolean) =>
  buildHandlerItem(
    { action_type: ALERT_EPISODE_ACTION_TYPE.ACK } as const,
    buildAlertEventRecord(),
    {
      actionState: { acknowledged },
    }
  );

const buildUnackItem = (acknowledged: boolean) =>
  buildHandlerItem(
    { action_type: ALERT_EPISODE_ACTION_TYPE.UNACK } as const,
    buildAlertEventRecord(),
    { actionState: { acknowledged } }
  );

describe('ackHandler', () => {
  it('declares that it needs the alert action state', () => {
    expect(ackHandler.requiresActionState).toBe(true);
  });

  it('forwards the precomputed audit doc when the alert is not acknowledged', () => {
    const item = buildAckItem(false);
    const prepared = ackHandler.prepare(item);

    expect(prepared.alertActionDoc).toBe(item.alertActionDoc);
  });

  it('builds no synthetic rule event — acknowledgement does not touch the lifecycle', () => {
    expect(ackHandler.prepare(buildAckItem(false)).ruleEvent).toBeUndefined();
  });

  it('rejects an already-acknowledged alert with a 409 INVALID_ALERT_STATE_TRANSITION', () => {
    expect(() => ackHandler.prepare(buildAckItem(true))).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 409 }),
        data: {
          code: 'INVALID_ALERT_STATE_TRANSITION',
          details: {
            group_hash: 'group-1',
            alert_id: 'episode-1',
            action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
          },
        },
      })
    );
  });
});

describe('unackHandler', () => {
  it('declares that it needs the alert action state', () => {
    expect(unackHandler.requiresActionState).toBe(true);
  });

  it('forwards the precomputed audit doc when the alert is acknowledged', () => {
    const item = buildUnackItem(true);
    const prepared = unackHandler.prepare(item);

    expect(prepared.alertActionDoc).toBe(item.alertActionDoc);
  });

  it('rejects an alert that is not acknowledged with a 409 INVALID_ALERT_STATE_TRANSITION', () => {
    expect(() => unackHandler.prepare(buildUnackItem(false))).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 409 }),
        data: {
          code: 'INVALID_ALERT_STATE_TRANSITION',
          details: {
            group_hash: 'group-1',
            alert_id: 'episode-1',
            action_type: ALERT_EPISODE_ACTION_TYPE.UNACK,
          },
        },
      })
    );
  });
});
