/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { renderingServiceMock } from '@kbn/core-rendering-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { QueryClient } from '@kbn/react-query';
import { createEditAssigneeAction } from './edit_assignee';
import * as flyout from '../components/assignee_flyout';
import * as bulk from './bulk_create_alert_actions';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
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
  overlays: overlayServiceMock.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
  rendering: renderingServiceMock.create(),
  userProfile: userProfileServiceMock.createStart(),
  docLinks: docLinksServiceMock.createStartContract(),
  queryClient: new QueryClient(),
});

describe('createEditAssigneeAction', () => {
  beforeEach(() => jest.restoreAllMocks());

  it('compatible when episodes.length > 0', () => {
    expect(createEditAssigneeAction(makeDeps()).isCompatible({ episodes: [makeEpisode()] })).toBe(
      true
    );
  });

  it('not compatible on empty selection', () => {
    expect(createEditAssigneeAction(makeDeps()).isCompatible({ episodes: [] })).toBe(false);
  });

  it('execute: cancelled flyout (resolves undefined) is a no-op', async () => {
    const deps = makeDeps();
    jest.spyOn(flyout, 'openAssigneeFlyout').mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    await createEditAssigneeAction(deps).execute({ episodes: [makeEpisode()], onSuccess });
    expect(deps.http.post).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('execute: opens flyout, POSTs per-episode ASSIGN items, toasts, calls onSuccess', async () => {
    const deps = makeDeps();
    jest.spyOn(flyout, 'openAssigneeFlyout').mockResolvedValue('u1');
    jest
      .spyOn(bulk, 'bulkCreateEpisodeAlertActions')
      .mockResolvedValue({ affected_count: 2, errors: [] });
    const onSuccess = jest.fn();

    await createEditAssigneeAction(deps).execute({
      episodes: [makeEpisode(), makeEpisode({ 'episode.id': 'e2' })],
      onSuccess,
    });

    expect(flyout.openAssigneeFlyout).toHaveBeenCalledWith(
      deps.overlays,
      deps.rendering,
      {
        queryClient: deps.queryClient,
        kibanaServices: {
          notifications: deps.notifications,
          userProfile: deps.userProfile,
          docLinks: deps.docLinks,
        },
      },
      { lastAssigneeUid: null, episodeCount: 2 }
    );
    expect(bulk.bulkCreateEpisodeAlertActions).toHaveBeenCalledWith(deps.http, [
      { episode_id: 'e1', action_type: 'assign', assignee_uid: 'u1' },
      { episode_id: 'e2', action_type: 'assign', assignee_uid: 'u1' },
    ]);
    expect(deps.notifications.toasts.add).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('execute: pre-populates the flyout with the current assignee for a single episode', async () => {
    const deps = makeDeps();
    jest.spyOn(flyout, 'openAssigneeFlyout').mockResolvedValue('u2');
    jest
      .spyOn(bulk, 'bulkCreateEpisodeAlertActions')
      .mockResolvedValue({ affected_count: 1, errors: [] });

    await createEditAssigneeAction(deps).execute({
      episodes: [makeEpisode({ last_assignee_uid: 'u1' })],
    });

    expect(flyout.openAssigneeFlyout).toHaveBeenCalledWith(
      deps.overlays,
      deps.rendering,
      expect.any(Object),
      { lastAssigneeUid: 'u1', episodeCount: 1 }
    );
  });

  it('execute: null result POSTs ASSIGN items that clear the assignee', async () => {
    const deps = makeDeps();
    jest.spyOn(flyout, 'openAssigneeFlyout').mockResolvedValue(null);
    jest
      .spyOn(bulk, 'bulkCreateEpisodeAlertActions')
      .mockResolvedValue({ affected_count: 1, errors: [] });
    const onSuccess = jest.fn();

    await createEditAssigneeAction(deps).execute({ episodes: [makeEpisode()], onSuccess });

    expect(bulk.bulkCreateEpisodeAlertActions).toHaveBeenCalledWith(deps.http, [
      { episode_id: 'e1', action_type: 'assign', assignee_uid: null },
    ]);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('execute: error path calls notifications.toasts.addDanger', async () => {
    const deps = makeDeps();
    jest.spyOn(flyout, 'openAssigneeFlyout').mockResolvedValue('u1');
    jest.spyOn(bulk, 'bulkCreateEpisodeAlertActions').mockRejectedValue(new Error('network error'));
    const onSuccess = jest.fn();

    await createEditAssigneeAction(deps).execute({ episodes: [makeEpisode()], onSuccess });

    expect(deps.notifications.toasts.addDanger).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
