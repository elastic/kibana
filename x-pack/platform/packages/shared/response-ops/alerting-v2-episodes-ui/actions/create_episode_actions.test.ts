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
import type { AddToCaseCasesService } from '../components/add_to_case_modal';
import type { EpisodeDataSource } from '../types/episode_data_source';
import { createAddToCaseAction } from './add_to_case';
import { ADD_TO_CASE_EPISODE_ACTION_ID } from './add_to_case_action_id';
import { createEpisodeActions } from './create_episode_actions';

const buildActions = (additionalDataSource?: EpisodeDataSource) =>
  createEpisodeActions({
    http: httpServiceMock.createStartContract(),
    overlays: overlayServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    rendering: renderingServiceMock.create(),
    application: applicationServiceMock.createStartContract(),
    userProfile: userProfileServiceMock.createStart(),
    docLinks: docLinksServiceMock.createStartContract(),
    expressions: expressionsPluginMock.createStartContract(),
    spaces: spacesPluginMock.createStartContract(),
    queryClient: new QueryClient(),
    isRuleAvailable: () => true,
    getDiscoverHref: async () => 'https://discover/foo',
    additionalDataSource,
  });

describe('createEpisodeActions', () => {
  it('returns all 9 actions sorted by order asc', () => {
    const actions = buildActions();
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
    ]);
  });

  it('sorts the host add to case action before edit alert tags', () => {
    const addToCaseAction = createAddToCaseAction({
      cases: {} as AddToCaseCasesService,
      owner: 'observability',
      rendering: renderingServiceMock.create(),
      kibanaServices: {},
    });
    const actions = buildActions({
      id: 'host',
      label: 'Host',
      queryKeyPrefix: ['host'],
      fetchEpisodes: async () => [],
      createActions: () => [addToCaseAction],
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
    ]);
  });
});

describe('enforcesOwnPrivileges', () => {
  it('is only set on open in Discover among the built-in actions', () => {
    const ids = buildActions()
      .filter((action) => action.enforcesOwnPrivileges === true)
      .map((action) => action.id);

    expect(ids).toEqual(['ALERTING_V2_OPEN_EPISODE_IN_DISCOVER']);
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
