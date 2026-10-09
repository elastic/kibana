/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { buildAlertEventRecord, buildHandlerItem } from '../test_utils';
import { tagHandler } from './tag';

const buildItem = (requested: string[], current: string[]) =>
  buildHandlerItem(
    { action_type: ALERT_EPISODE_ACTION_TYPE.TAG, tags: requested } as const,
    buildAlertEventRecord(),
    { actionState: { tags: current } }
  );

describe('tagHandler', () => {
  it('declares that it needs the alert action state', () => {
    expect(tagHandler.requiresActionState).toBe(true);
  });

  it('forwards the precomputed audit doc when the set changes', () => {
    const item = buildItem(['prod', 'db'], ['prod']);
    const prepared = tagHandler.prepare(item);

    expect(prepared.alertActionDoc).toBe(item.alertActionDoc);
  });

  it('accepts tagging an untagged alert', () => {
    expect(() => tagHandler.prepare(buildItem(['prod'], []))).not.toThrow();
  });

  it('accepts clearing the tags of a tagged alert', () => {
    expect(() => tagHandler.prepare(buildItem([], ['prod']))).not.toThrow();
  });

  it('accepts a request that drops one tag of several', () => {
    expect(() => tagHandler.prepare(buildItem(['prod'], ['prod', 'db']))).not.toThrow();
  });

  it('rejects the same set with a 409 ALERT_ACTION_NO_OP', () => {
    expect(() => tagHandler.prepare(buildItem(['prod'], ['prod']))).toThrow(
      expect.objectContaining({
        output: expect.objectContaining({ statusCode: 409 }),
        data: {
          code: 'ALERT_ACTION_NO_OP',
          details: {
            group_hash: 'group-1',
            alert_id: 'episode-1',
            action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
          },
        },
      })
    );
  });

  it('compares sets, so a reordered request is still a no-op', () => {
    expect(() => tagHandler.prepare(buildItem(['db', 'prod'], ['prod', 'db']))).toThrow(
      expect.objectContaining({ data: expect.objectContaining({ code: 'ALERT_ACTION_NO_OP' }) })
    );
  });

  it('compares sets, so a repeated tag in the request is still a no-op', () => {
    expect(() => tagHandler.prepare(buildItem(['prod', 'prod'], ['prod']))).toThrow(
      expect.objectContaining({ data: expect.objectContaining({ code: 'ALERT_ACTION_NO_OP' }) })
    );
  });

  it('rejects clearing the tags of an untagged alert', () => {
    expect(() => tagHandler.prepare(buildItem([], []))).toThrow(
      expect.objectContaining({
        message: '[episode-1] already has these tags.',
      })
    );
  });
});
