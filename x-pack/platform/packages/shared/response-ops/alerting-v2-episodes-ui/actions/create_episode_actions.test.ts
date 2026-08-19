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
import { createEpisodeActions, READ_SAFE_EPISODE_ACTION_IDS } from './create_episode_actions';

const buildActions = () =>
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
    getDiscoverHref: async () => 'https://discover/foo',
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
});

describe('READ_SAFE_EPISODE_ACTION_IDS', () => {
  it('contains exactly the non-mutating (navigation-only) episode actions', () => {
    expect([...READ_SAFE_EPISODE_ACTION_IDS]).toEqual(['ALERTING_V2_OPEN_EPISODE_IN_DISCOVER']);
  });

  it('is a subset of the ids produced by createEpisodeActions', () => {
    const allIds = new Set(buildActions().map((action) => action.id));
    for (const id of READ_SAFE_EPISODE_ACTION_IDS) {
      expect(allIds.has(id)).toBe(true);
    }
  });
});
