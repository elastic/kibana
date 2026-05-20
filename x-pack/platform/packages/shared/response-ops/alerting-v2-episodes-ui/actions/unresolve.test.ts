/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { createUnresolveAction } from './unresolve';
import * as bulk from './bulk_create_alert_actions';
import type { AlertEpisode } from '../queries/episodes_query';

const makeEpisode = (overrides: Partial<AlertEpisode> = {}): AlertEpisode => ({
  '@timestamp': '2026-04-23T00:00:00Z',
  'episode.id': 'e1',
  'episode.status': ALERT_EPISODE_STATUS.INACTIVE,
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

describe('createUnresolveAction', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('compatible when some episode is not activated and not already ACTIVE', () => {
    expect(
      createUnresolveAction(makeDeps()).isCompatible({
        episodes: [makeEpisode({ last_deactivate_action: undefined })],
      })
    ).toBe(true);
  });

  it('not compatible when every episode is already activated', () => {
    expect(
      createUnresolveAction(makeDeps()).isCompatible({
        episodes: [makeEpisode({ last_deactivate_action: 'activate' })],
      })
    ).toBe(false);
  });

  it('not compatible when every episode has status ACTIVE', () => {
    expect(
      createUnresolveAction(makeDeps()).isCompatible({
        episodes: [
          makeEpisode({
            'episode.status': ALERT_EPISODE_STATUS.ACTIVE,
            last_deactivate_action: undefined,
          }),
        ],
      })
    ).toBe(false);
  });

  it('not compatible on empty selection', () => {
    expect(createUnresolveAction(makeDeps()).isCompatible({ episodes: [] })).toBe(false);
  });

  it('execute: POSTs unique-by-group ACTIVATE items with reason, toasts, calls onSuccess', async () => {
    const deps = makeDeps();
    jest.spyOn(bulk, 'bulkCreateAlertActions').mockResolvedValue({ processed: 1, total: 1 });
    const onSuccess = jest.fn();
    await createUnresolveAction(deps).execute({
      episodes: [
        makeEpisode({ group_hash: 'g1' }),
        // same group — should be deduped
        makeEpisode({ 'episode.id': 'e2', group_hash: 'g1' }),
      ],
      onSuccess,
    });
    expect(bulk.bulkCreateAlertActions).toHaveBeenCalledWith(deps.http, [
      { group_hash: 'g1', action_type: 'activate', reason: expect.any(String) },
    ]);
    expect(deps.notifications.toasts.add).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('execute: error path calls notifications.toasts.addDanger with BULK_ERROR_TOAST', async () => {
    const deps = makeDeps();
    jest.spyOn(bulk, 'bulkCreateAlertActions').mockRejectedValue(new Error('network error'));
    const onSuccess = jest.fn();
    await createUnresolveAction(deps).execute({
      episodes: [makeEpisode()],
      onSuccess,
    });
    expect(deps.notifications.toasts.addDanger).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
