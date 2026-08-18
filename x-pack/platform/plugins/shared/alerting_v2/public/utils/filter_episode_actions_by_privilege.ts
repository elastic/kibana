/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  READ_SAFE_EPISODE_ACTION_IDS,
  type EpisodeAction,
} from '@kbn/alerting-v2-episodes-ui/actions';

/**
 * Privilege level applied when filtering episode actions: `all` keeps every
 * action, `read` keeps only the read-safe allowlist.
 */
export const EPISODE_ACTIONS_PRIVILEGE = {
  all: 'all',
  read: 'read',
} as const;

export type EpisodeActionsPrivilege =
  (typeof EPISODE_ACTIONS_PRIVILEGE)[keyof typeof EPISODE_ACTIONS_PRIVILEGE];

/**
 * Removes mutating (write) episode actions when the user only has read
 * privilege. With `all` every action is kept; with `read` only actions in the
 * read-safe allowlist survive, so any action that is not explicitly read-safe
 * stays hidden by default.
 */
export const filterEpisodeActionsByPrivilege = (
  actions: EpisodeAction[],
  capability: EpisodeActionsPrivilege
): EpisodeAction[] =>
  capability === EPISODE_ACTIONS_PRIVILEGE.all
    ? actions
    : actions.filter((action) => READ_SAFE_EPISODE_ACTION_IDS.has(action.id));
