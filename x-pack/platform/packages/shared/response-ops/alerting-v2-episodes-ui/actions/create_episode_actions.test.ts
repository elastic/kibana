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
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { QueryClient } from '@kbn/react-query';
import type { AlertEpisode } from '../queries/episodes_query';
import type { AddToCaseCasesService } from '../components/add_to_case_modal';
import type { EpisodeDataSource } from '../types/episode_data_source';
import type { CanWriteEpisode } from '../utils/episode_write_privilege';
import { createAddToCaseAction } from './add_to_case';
import { ADD_TO_CASE_EPISODE_ACTION_ID } from './add_to_case_action_id';
import { createEpisodeActions } from './create_episode_actions';

const writeAll = { canWriteNativeEpisodes: true, canWriteSourceEpisode: () => true };

const buildActions = ({
  additionalDataSource,
  includeHistory = true,
  isAlertEventsHistoryAvailable = true,
  canWriteNativeEpisodes,
  canWriteSourceEpisode,
}: {
  additionalDataSource?: EpisodeDataSource;
  includeHistory?: boolean;
  isAlertEventsHistoryAvailable?: boolean;
  canWriteNativeEpisodes: boolean;
  canWriteSourceEpisode: CanWriteEpisode;
}) =>
  createEpisodeActions({
    http: httpServiceMock.createStartContract(),
    overlays: overlayServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    rendering: renderingServiceMock.create(),
    application: applicationServiceMock.createStartContract(),
    canWriteNativeEpisodes,
    canWriteSourceEpisode,
    userProfile: userProfileServiceMock.createStart(),
    docLinks: docLinksServiceMock.createStartContract(),
    expressions: expressionsPluginMock.createStartContract(),
    spaces: spacesPluginMock.createStartContract(),
    queryClient: new QueryClient(),
    isRuleAvailable: () => true,
    getDiscoverHref: async () => 'https://discover/foo',
    ...(includeHistory
      ? {
          getAlertEventsHistoryHref: async () => 'https://discover/history',
          isAlertEventsHistoryAvailable: () => isAlertEventsHistoryAvailable,
        }
      : {}),
    additionalDataSource,
  });

describe('createEpisodeActions', () => {
  it('returns all 10 actions sorted by order asc', () => {
    const actions = buildActions(writeAll);
    expect(actions.map((a) => a.id)).toEqual([
      'ALERTING_V2_ACK_EPISODE',
      'ALERTING_V2_UNACK_EPISODE',
      'ALERTING_V2_SNOOZE_EPISODE',
      'ALERTING_V2_UNSNOOZE_EPISODE',
      'ALERTING_V2_RESOLVE_EPISODE',
      'ALERTING_V2_UNRESOLVE_EPISODE',
      'ALERTING_V2_EDIT_EPISODE_TAGS',
      'ALERTING_V2_EDIT_EPISODE_ASSIGNEE',
      'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER',
      'ALERTING_V2_OPEN_ALERT_EVENTS_HISTORY_IN_DISCOVER',
    ]);
  });

  it('omits alert events history when the surface does not provide its resolver', () => {
    expect(
      buildActions({ ...writeAll, includeHistory: false }).map((action) => action.id)
    ).not.toContain('ALERTING_V2_OPEN_ALERT_EVENTS_HISTORY_IN_DISCOVER');
  });

  it('disables alert events history when Discover is unavailable', () => {
    const episode = { 'episode.id': 'e1' } as AlertEpisode;
    const available = buildActions(writeAll).find(
      ({ id }) => id === 'ALERTING_V2_OPEN_ALERT_EVENTS_HISTORY_IN_DISCOVER'
    );
    const unavailable = buildActions({ ...writeAll, isAlertEventsHistoryAvailable: false }).find(
      ({ id }) => id === 'ALERTING_V2_OPEN_ALERT_EVENTS_HISTORY_IN_DISCOVER'
    );

    expect(available?.isCompatible({ episodes: [episode] })).toBe(true);
    expect(available?.showWhenDisabled?.({ episodes: [episode] })).toBe(false);
    expect(unavailable?.isCompatible({ episodes: [episode] })).toBe(false);
    expect(unavailable?.showWhenDisabled?.({ episodes: [episode] })).toBe(true);
  });

  it('sorts the host add to case action before edit alert tags', () => {
    const addToCaseAction = createAddToCaseAction({
      cases: {} as AddToCaseCasesService,
      owner: 'observability',
      rendering: renderingServiceMock.create(),
      kibanaServices: {},
    });
    const actions = buildActions({
      ...writeAll,
      additionalDataSource: {
        id: 'host',
        label: 'Host',
        queryKeyPrefix: ['host'],
        fetchEpisodes: async () => [],
        useWriteAccess: () => () => true,
        createActions: () => [addToCaseAction],
      },
    });

    expect(actions.map((a) => a.id)).toEqual([
      'ALERTING_V2_ACK_EPISODE',
      'ALERTING_V2_UNACK_EPISODE',
      'ALERTING_V2_SNOOZE_EPISODE',
      'ALERTING_V2_UNSNOOZE_EPISODE',
      'ALERTING_V2_RESOLVE_EPISODE',
      'ALERTING_V2_UNRESOLVE_EPISODE',
      ADD_TO_CASE_EPISODE_ACTION_ID,
      'ALERTING_V2_EDIT_EPISODE_TAGS',
      'ALERTING_V2_EDIT_EPISODE_ASSIGNEE',
      'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER',
      'ALERTING_V2_OPEN_ALERT_EVENTS_HISTORY_IN_DISCOVER',
    ]);
  });
});

describe('write privilege', () => {
  const nativeEpisode = { 'episode.id': 'e1' } as AlertEpisode;
  const sourceEpisode = { 'episode.id': 'e2', source_id: 'classic' } as AlertEpisode;

  const createSource = (): EpisodeDataSource => ({
    id: 'classic',
    label: 'Classic',
    queryKeyPrefix: ['classic'],
    fetchEpisodes: async () => [],
    useWriteAccess: () => () => true,
    actionExtensions: [
      {
        actionId: 'ALERTING_V2_ACK_EPISODE',
        isCompatible: () => true,
        execute: async () => ({ succeeded: 1, failed: 0 }),
      },
    ],
  });

  const ackAction = (actions: ReturnType<typeof buildActions>) =>
    actions.find(({ id }) => id === 'ALERTING_V2_ACK_EPISODE');

  it('hides mutating actions from a read-only user', () => {
    const actions = buildActions({
      canWriteNativeEpisodes: false,
      canWriteSourceEpisode: () => false,
    });

    expect(ackAction(actions)?.isCompatible({ episodes: [nativeEpisode] })).toBe(false);
    expect(
      actions
        .find(({ id }) => id === 'ALERTING_V2_OPEN_ALERT_EVENTS_HISTORY_IN_DISCOVER')
        ?.isCompatible({ episodes: [nativeEpisode] })
    ).toBe(true);
  });

  it('keeps source rows writable when only the source grants write privilege', () => {
    const actions = buildActions({
      canWriteNativeEpisodes: false,
      additionalDataSource: createSource(),
      canWriteSourceEpisode: () => true,
    });

    expect(ackAction(actions)?.isCompatible({ episodes: [sourceEpisode] })).toBe(true);
    expect(ackAction(actions)?.isCompatible({ episodes: [nativeEpisode] })).toBe(false);
  });

  it('keeps source rows read-only when only the universal privilege is granted', () => {
    const actions = buildActions({
      canWriteNativeEpisodes: true,
      additionalDataSource: createSource(),
      canWriteSourceEpisode: () => false,
    });

    expect(ackAction(actions)?.isCompatible({ episodes: [sourceEpisode] })).toBe(false);
    expect(ackAction(actions)?.isCompatible({ episodes: [nativeEpisode] })).toBe(true);
  });

  it('resolves source rows individually', () => {
    const otherSourceEpisode = { 'episode.id': 'e3', source_id: 'classic' } as AlertEpisode;
    const actions = buildActions({
      canWriteNativeEpisodes: false,
      additionalDataSource: createSource(),
      canWriteSourceEpisode: (episode) => episode['episode.id'] === 'e2',
    });

    expect(ackAction(actions)?.isCompatible({ episodes: [sourceEpisode] })).toBe(true);
    expect(ackAction(actions)?.isCompatible({ episodes: [otherSourceEpisode] })).toBe(false);
  });
});

describe('enforcesOwnPrivileges', () => {
  it('is only set on open in Discover among the built-in actions', () => {
    const ids = buildActions(writeAll)
      .filter((action) => action.enforcesOwnPrivileges === true)
      .map((action) => action.id);

    expect(ids).toEqual([
      'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER',
      'ALERTING_V2_OPEN_ALERT_EVENTS_HISTORY_IN_DISCOVER',
    ]);
  });

  it('is set on the host add to case action', () => {
    const addToCaseAction = createAddToCaseAction({
      cases: {} as AddToCaseCasesService,
      owner: 'observability',
      rendering: renderingServiceMock.create(),
      kibanaServices: {},
    });

    expect(addToCaseAction.enforcesOwnPrivileges).toBe(true);
  });
});
