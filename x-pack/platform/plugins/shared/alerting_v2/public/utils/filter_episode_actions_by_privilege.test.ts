/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import {
  filterEpisodeActionsByPrivilege,
  EPISODE_ACTIONS_PRIVILEGE,
} from './filter_episode_actions_by_privilege';

const makeAction = (id: string): EpisodeAction => ({
  id,
  order: 1,
  displayName: id,
  iconType: 'gear',
  isCompatible: () => true,
  execute: async () => {},
});

const ackAction = makeAction('ALERTING_V2_ACK_EPISODE');
const discoverAction = makeAction('ALERTING_V2_OPEN_EPISODE_IN_DISCOVER');

describe('filterEpisodeActionsByPrivilege', () => {
  it('returns every action for the "all" capability', () => {
    const actions = [ackAction, discoverAction];
    expect(filterEpisodeActionsByPrivilege(actions, EPISODE_ACTIONS_PRIVILEGE.all)).toBe(actions);
  });

  it('keeps only read-safe actions for the "read" capability', () => {
    const result = filterEpisodeActionsByPrivilege(
      [ackAction, discoverAction],
      EPISODE_ACTIONS_PRIVILEGE.read
    );
    expect(result).toEqual([discoverAction]);
  });

  it('hides actions that are not explicitly read-safe by default', () => {
    const unknownMutatingAction = makeAction('ALERTING_V2_SOME_FUTURE_MUTATION');
    const result = filterEpisodeActionsByPrivilege(
      [unknownMutatingAction, discoverAction],
      EPISODE_ACTIONS_PRIVILEGE.read
    );
    expect(result).toEqual([discoverAction]);
  });
});
