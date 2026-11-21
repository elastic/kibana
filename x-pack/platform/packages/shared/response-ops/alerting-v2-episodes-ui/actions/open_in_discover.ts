/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core-application-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { EpisodeAction } from './types';
import type { EpisodeDiscoverExtension } from '../types/episode_data_source';
import {
  episodeSupportsActions,
  isSourceEpisode,
  type AlertEpisode,
} from '../queries/episodes_query';
import {
  getDiscoverTimeRangeAroundTimestamp,
  type DataViewDiscoverLocatorParams,
} from '../utils/discover_href_for_alert';
import { getErrorMessage } from './helpers';
import * as i18n from './translations';

export const OPEN_IN_DISCOVER_EPISODE_ACTION_ID = 'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER';

export interface OpenInDiscoverActionDeps {
  application: ApplicationStart;
  isRuleAvailable: (ruleId: string) => boolean;
  /**
   * Resolves the Discover URL for an episode. May be async (e.g. if rule ES|QL is fetched on demand).
   * Caller returns undefined when no valid URL can be produced (rule without ES|QL, user lacks Discover access, etc.).
   */
  getDiscoverHref: (args: {
    episodeIsoTimestamp: string;
    ruleId: string;
  }) => string | undefined | Promise<string | undefined>;
  http: HttpStart;
  notifications: NotificationsStart;
  /** Discover locator for data view links; undefined when the user cannot open Discover. */
  discoverLocator?: LocatorPublic<DataViewDiscoverLocatorParams>;
  /** Source extension that opens the source's own rows in Discover. */
  extension?: EpisodeDiscoverExtension;
}

export const createOpenInDiscoverAction = (deps: OpenInDiscoverActionDeps): EpisodeAction => {
  const { application, http, notifications, discoverLocator, extension } = deps;

  const isNativeCompatible = (ep: AlertEpisode): boolean => {
    if (!episodeSupportsActions(ep)) return false;

    const ruleId = ep['rule.id'];
    return Boolean(ruleId) && deps.isRuleAvailable(ruleId);
  };

  const isSourceCompatible = (ep: AlertEpisode): boolean =>
    Boolean(discoverLocator && extension?.isCompatible(ep));

  const getSourceDiscoverHref = async (ep: AlertEpisode): Promise<string | undefined> => {
    if (!discoverLocator || !extension) return undefined;

    const target = await extension.getDiscoverTarget(ep, { http });
    if (!target) return undefined;
    if ('url' in target) return target.url;

    const { locatorParams } = target;

    return discoverLocator.getRedirectUrl({
      ...locatorParams,
      timeRange: locatorParams.timeRange ?? getDiscoverTimeRangeAroundTimestamp(ep.first_timestamp),
    });
  };

  const executeForSource = async (ep: AlertEpisode): Promise<void> => {
    let href: string | undefined;
    try {
      href = await getSourceDiscoverHref(ep);
    } catch (error) {
      notifications.toasts.addDanger({
        title: i18n.OPEN_IN_DISCOVER_ERROR,
        text: getErrorMessage(error),
      });
      return;
    }

    if (!href) {
      notifications.toasts.addWarning(i18n.OPEN_IN_DISCOVER_UNAVAILABLE);
      return;
    }

    await application.navigateToUrl(href);
  };

  return {
    id: OPEN_IN_DISCOVER_EPISODE_ACTION_ID,
    order: 50,
    displayName: i18n.OPEN_IN_DISCOVER,
    iconType: 'productDiscover',
    enforcesOwnPrivileges: true,
    isCompatible: ({ episodes }) => {
      if (episodes.length !== 1) return false;

      const [ep] = episodes;
      return isSourceEpisode(ep) ? isSourceCompatible(ep) : isNativeCompatible(ep);
    },
    execute: async ({ episodes }) => {
      const [ep] = episodes;
      if (isSourceEpisode(ep)) {
        await executeForSource(ep);
        return;
      }

      const href = await deps.getDiscoverHref({
        episodeIsoTimestamp: ep['@timestamp'],
        ruleId: ep['rule.id'],
      });
      if (!href) return;
      await application.navigateToUrl(href);
    },
  };
};
