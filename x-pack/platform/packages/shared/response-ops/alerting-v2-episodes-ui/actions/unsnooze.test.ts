/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { createUnsnoozeAction } from './unsnooze';
import * as bulk from './bulk_create_alert_actions';
import type { AlertEpisode } from '../queries/episodes_query';

const makeEpisode = (overrides: Partial<AlertEpisode> = {}): AlertEpisode => ({
  '@timestamp': '2026-04-23T00:00:00Z',
  'episode.id': 'e1',
  'episode.status': 'active' as any,
  'rule.id': 'r1',
  group_hash: 'g1',
  first_timestamp: '2026-04-23T00:00:00Z',
  last_timestamp: '2026-04-23T00:00:00Z',
  duration: 0,
  ...overrides,
});

const makeDeps = () => ({
  http: httpServiceMock.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
});

describe('createUnsnoozeAction', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('compatible when at least one episode is snoozed', () => {
    expect(
      createUnsnoozeAction(makeDeps()).isCompatible({
        episodes: [makeEpisode({ last_snooze_action: 'snooze' })],
      })
    ).toBe(true);
  });

  it('not compatible when no episode is snoozed', () => {
    expect(
      createUnsnoozeAction(makeDeps()).isCompatible({
        episodes: [makeEpisode({ last_snooze_action: 'unsnooze' })],
      })
    ).toBe(false);
  });

  it('not compatible on empty selection', () => {
    expect(createUnsnoozeAction(makeDeps()).isCompatible({ episodes: [] })).toBe(false);
  });

  it('execute: POSTs unique-by-group UNSNOOZE items, toasts, calls onSuccess', async () => {
    const deps = makeDeps();
    jest.spyOn(bulk, 'bulkCreateAlertActions').mockResolvedValue({ processed: 2, total: 2 });
    const onSuccess = jest.fn();
    await createUnsnoozeAction(deps).execute({
      episodes: [
        makeEpisode({ last_snooze_action: 'snooze' }),
        makeEpisode({ 'episode.id': 'e2', group_hash: 'g2', last_snooze_action: 'snooze' }),
      ],
      onSuccess,
    });
    expect(bulk.bulkCreateAlertActions).toHaveBeenCalledWith(deps.http, [
      { group_hash: 'g1', action_type: 'unsnooze' },
      { group_hash: 'g2', action_type: 'unsnooze' },
    ]);
    expect(deps.notifications.toasts.add).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('execute: error path calls notifications.toasts.addDanger with BULK_ERROR_TOAST', async () => {
    const deps = makeDeps();
    jest.spyOn(bulk, 'bulkCreateAlertActions').mockRejectedValue(new Error('network error'));
    const onSuccess = jest.fn();
    await createUnsnoozeAction(deps).execute({
      episodes: [makeEpisode({ last_snooze_action: 'snooze' })],
      onSuccess,
    });
    expect(deps.notifications.toasts.addDanger).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
