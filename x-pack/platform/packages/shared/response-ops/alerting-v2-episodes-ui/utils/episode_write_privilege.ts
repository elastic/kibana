/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeAction } from '../actions/types';
import type { AlertEpisode } from '../queries/episodes_query';

export type CanWriteEpisode = (episode: AlertEpisode) => boolean;

/**
 * Narrows an action to the episodes the user may modify, leaving actions that enforce their own
 * privileges untouched.
 */
export const withEpisodeWritePrivilege = (
  action: EpisodeAction,
  canWriteEpisode: CanWriteEpisode
): EpisodeAction => {
  if (action.enforcesOwnPrivileges) {
    return action;
  }

  const { showWhenDisabled, getBulkDisabledReason, renderMenuItem, renderInlineControl } = action;
  const writable = (episodes: AlertEpisode[]): AlertEpisode[] => episodes.filter(canWriteEpisode);

  return {
    ...action,
    isCompatible: (ctx) => action.isCompatible({ ...ctx, episodes: writable(ctx.episodes) }),
    execute: async (ctx) => {
      const episodes = writable(ctx.episodes);
      if (!episodes.length) return;

      await action.execute({ ...ctx, episodes });
    },
    ...(showWhenDisabled && {
      showWhenDisabled: (ctx) => showWhenDisabled({ ...ctx, episodes: writable(ctx.episodes) }),
    }),
    ...(getBulkDisabledReason && {
      getBulkDisabledReason: (episodes: AlertEpisode[]) => {
        const writableEpisodes = writable(episodes);
        return writableEpisodes.length ? getBulkDisabledReason(writableEpisodes) : undefined;
      },
    }),
    ...(renderMenuItem && {
      renderMenuItem: (ctx) => renderMenuItem({ ...ctx, episodes: writable(ctx.episodes) }),
    }),
    ...(renderInlineControl && {
      renderInlineControl: (ctx) =>
        renderInlineControl({ ...ctx, episodes: writable(ctx.episodes) }),
    }),
  };
};
