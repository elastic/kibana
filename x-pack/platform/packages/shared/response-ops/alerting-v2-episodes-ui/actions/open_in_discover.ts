/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EpisodeAction } from './types';
import * as i18n from './translations';

export interface OpenInDiscoverActionDeps {
  application: ApplicationStart;
  /**
   * Resolves the Discover URL for an episode. May be async (e.g. if rule ES|QL is fetched on demand).
   * Caller returns undefined when no valid URL can be produced (rule without ES|QL, user lacks Discover access, etc.).
   */
  getDiscoverHref: (args: {
    episodeIsoTimestamp: string;
    ruleId: string;
  }) => string | undefined | Promise<string | undefined>;
}

export const createOpenInDiscoverAction = (deps: OpenInDiscoverActionDeps): EpisodeAction => ({
  id: 'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER',
  order: 50,
  displayName: i18n.OPEN_IN_DISCOVER,
  iconType: 'discoverApp',
  isCompatible: ({ episodes }) => episodes.length === 1,
  execute: async ({ episodes }) => {
    const [ep] = episodes;
    const href = await deps.getDiscoverHref({
      episodeIsoTimestamp: ep['@timestamp'],
      ruleId: ep['rule.id'],
    });
    if (!href) return;
    await deps.application.navigateToUrl(href);
  },
});
