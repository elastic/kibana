/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EpisodeAction } from './types';
import * as i18n from './translations';

export interface ViewDetailsActionDeps {
  application: ApplicationStart;
  /** Resolves the in-app path for an episode details page. Caller prepends basePath. */
  getEpisodeDetailsHref: (episodeId: string) => string;
}

export const createViewDetailsAction = (deps: ViewDetailsActionDeps): EpisodeAction => ({
  id: 'ALERTING_V2_VIEW_EPISODE_DETAILS',
  order: 0,
  displayName: i18n.VIEW_DETAILS,
  iconType: 'eye',
  isCompatible: ({ episodes }) => episodes.length === 1 && !!episodes[0]['episode.id'],
  execute: async ({ episodes }) => {
    const [ep] = episodes;
    const href = deps.getEpisodeDetailsHref(ep['episode.id']);
    await deps.application.navigateToUrl(href);
  },
});
