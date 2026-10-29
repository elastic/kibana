/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeAction } from '../actions';
import {
  filterAlertActionsByPrivilege,
  ALERT_ACTIONS_PRIVILEGE,
} from './filter_alert_actions_by_privilege';

const makeAction = (id: string, overrides: Partial<EpisodeAction> = {}): EpisodeAction => ({
  id,
  order: 1,
  displayName: id,
  iconType: 'gear',
  isCompatible: () => true,
  execute: async () => {},
  ...overrides,
});

const ackAction = makeAction('ALERTING_V2_ACK_EPISODE');
const discoverAction = makeAction('ALERTING_V2_OPEN_EPISODE_IN_DISCOVER', {
  enforcesOwnPrivileges: true,
});
const addToCaseAction = makeAction('ALERTING_V2_ADD_EPISODE_TO_CASE', {
  enforcesOwnPrivileges: true,
});

describe('filterAlertActionsByPrivilege', () => {
  it('returns every action for the "all" capability', () => {
    const actions = [ackAction, discoverAction];
    expect(filterAlertActionsByPrivilege(actions, ALERT_ACTIONS_PRIVILEGE.all)).toBe(actions);
  });

  it('keeps only actions that enforce their own privileges for the "read" capability', () => {
    const result = filterAlertActionsByPrivilege(
      [ackAction, discoverAction, addToCaseAction],
      ALERT_ACTIONS_PRIVILEGE.read
    );
    expect(result).toEqual([discoverAction, addToCaseAction]);
  });

  it('hides actions that leave enforcesOwnPrivileges unset by default', () => {
    const unknownMutatingAction = makeAction('ALERTING_V2_SOME_FUTURE_MUTATION');
    const result = filterAlertActionsByPrivilege(
      [unknownMutatingAction, discoverAction],
      ALERT_ACTIONS_PRIVILEGE.read
    );
    expect(result).toEqual([discoverAction]);
  });

  it('hides actions that set enforcesOwnPrivileges to false', () => {
    const optedOutAction = makeAction('ALERTING_V2_OPTED_OUT', { enforcesOwnPrivileges: false });
    const result = filterAlertActionsByPrivilege(
      [optedOutAction, discoverAction],
      ALERT_ACTIONS_PRIVILEGE.read
    );
    expect(result).toEqual([discoverAction]);
  });
});
