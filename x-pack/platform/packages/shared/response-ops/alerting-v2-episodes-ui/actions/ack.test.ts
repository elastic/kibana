/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { createAckAction } from './ack';
import * as bulk from './bulk_create_alert_actions';
import type { AlertEpisode } from '../queries/episodes_query';
import type { ClassicAlertActionContext } from '../classic_alerts/utils/map_alert';
const makeEpisode = (overrides: Partial<AlertEpisode> = {}): AlertEpisode =>
  ({
    '@timestamp': '2026-04-23T00:00:00Z',
    'episode.id': 'e1',
    'episode.status': 'active',
    'rule.id': 'r1',
    group_hash: 'g1',
    first_timestamp: '2026-04-23T00:00:00Z',
    last_timestamp: '2026-04-23T00:00:00Z',
    duration: 0,
    ...overrides,
  } as AlertEpisode);

const makeClassicEpisode = (id: string, status = 'open'): AlertEpisode =>
  makeEpisode({
    'episode.id': id,
    group_hash: id,
    source_id: 'classic-alerts',
    source_action_context: {
      index: '.alerts-test',
      alertUuid: id,
      instanceId: 'inst-1',
      ruleId: 'r1',
      workflowStatus: status,
      workflowTags: [],
    } as ClassicAlertActionContext,
  });

const makeDeps = () => ({
  http: httpServiceMock.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
});

describe('createAckAction', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('compatible when at least one episode is not acked', () => {
    expect(
      createAckAction(makeDeps()).isCompatible({
        episodes: [makeEpisode({ last_ack_action: 'unack' })],
      })
    ).toBe(true);
  });

  it('compatible when at least one episode has no ack action', () => {
    expect(
      createAckAction(makeDeps()).isCompatible({
        episodes: [makeEpisode()],
      })
    ).toBe(true);
  });

  it('compatible when a source episode has workflow_status=open and extension is provided', () => {
    const extension = {
      actionId: 'ALERTING_V2_ACK_EPISODE',
      isCompatible: (ep: AlertEpisode) =>
        (ep.source_action_context as ClassicAlertActionContext).workflowStatus !== 'acknowledged',
      execute: jest.fn(),
    };
    expect(
      createAckAction(makeDeps(), extension).isCompatible({
        episodes: [makeClassicEpisode('c1', 'open')],
      })
    ).toBe(true);
  });

  it('not compatible for source episode without extension', () => {
    expect(
      createAckAction(makeDeps()).isCompatible({
        episodes: [makeClassicEpisode('c1', 'open')],
      })
    ).toBe(false);
  });

  it('not compatible when all episodes are acked', () => {
    const extension = {
      actionId: 'ALERTING_V2_ACK_EPISODE',
      isCompatible: (ep: AlertEpisode) =>
        (ep.source_action_context as ClassicAlertActionContext).workflowStatus !== 'acknowledged',
      execute: jest.fn(),
    };
    expect(
      createAckAction(makeDeps(), extension).isCompatible({
        episodes: [
          makeEpisode({ last_ack_action: 'ack' }),
          makeClassicEpisode('c1', 'acknowledged'),
        ],
      })
    ).toBe(false);
  });

  it('not compatible on empty selection', () => {
    expect(createAckAction(makeDeps()).isCompatible({ episodes: [] })).toBe(false);
  });

  it('execute: POSTs per-episode ACK items with distinct episode_ids, toasts, calls onSuccess', async () => {
    const deps = makeDeps();
    jest.spyOn(bulk, 'bulkCreateAlertActions').mockResolvedValue({ affected_count: 2, errors: [] });
    const onSuccess = jest.fn();
    await createAckAction(deps).execute({
      episodes: [
        makeEpisode({ 'episode.id': 'e1', group_hash: 'g1' }),
        makeEpisode({ 'episode.id': 'e2', group_hash: 'g1' }),
      ],
      onSuccess,
    });
    expect(bulk.bulkCreateAlertActions).toHaveBeenCalledWith(deps.http, [
      { group_hash: 'g1', action_type: 'ack', episode_id: 'e1' },
      { group_hash: 'g1', action_type: 'ack', episode_id: 'e2' },
    ]);
    expect(deps.notifications.toasts.add).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('execute: dispatches to extension for source episodes in mixed selection', async () => {
    const deps = makeDeps();
    const extensionExecute = jest.fn().mockResolvedValue({ succeeded: 1, failed: 0 });
    const extension = {
      actionId: 'ALERTING_V2_ACK_EPISODE',
      isCompatible: () => true,
      execute: extensionExecute,
    };

    jest.spyOn(bulk, 'bulkCreateAlertActions').mockResolvedValue({ affected_count: 1, errors: [] });
    const onSuccess = jest.fn();

    await createAckAction(deps, extension).execute({
      episodes: [makeEpisode({ 'episode.id': 'e1', group_hash: 'g1' }), makeClassicEpisode('c1')],
      onSuccess,
    });

    expect(bulk.bulkCreateAlertActions).toHaveBeenCalled();
    expect(extensionExecute).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('execute: error path calls notifications.toasts.addDanger with BULK_ERROR_TOAST', async () => {
    const deps = makeDeps();
    jest.spyOn(bulk, 'bulkCreateAlertActions').mockRejectedValue(new Error('network error'));
    const onSuccess = jest.fn();
    await createAckAction(deps).execute({
      episodes: [makeEpisode()],
      onSuccess,
    });
    expect(deps.notifications.toasts.addDanger).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
