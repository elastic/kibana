/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeAction } from '../actions/types';
import type { EpisodeActionsDeps } from '../actions/create_episode_actions';
import * as i18n from '../actions/translations';
import { getErrorMessage } from '../actions/helpers';
import { isSourceEpisode, type AlertEpisode } from '../queries/episodes_query';
import {
  getDiscoverTimeRangeAroundTimestamp,
  type AlertDiscoverLinkResolvers,
} from '../utils/discover_href_for_alert';
import { getActionContext } from './action_extensions';
import { fetchClassicAlertById } from './apis/fetch_classic_alert_by_id';
import {
  getClassicAlertDiscoverTarget,
  hasDiscoverLinkResolver,
} from './utils/get_classic_alert_discover_target';

export const CLASSIC_OPEN_IN_DISCOVER_ACTION_ID = 'ALERTING_V2_OPEN_CLASSIC_ALERT_IN_DISCOVER';

export type ClassicOpenInDiscoverActionDeps = Pick<
  EpisodeActionsDeps,
  'http' | 'application' | 'notifications' | 'discoverLocator'
> & {
  ruleTypeIds: string[];
  resolvers: AlertDiscoverLinkResolvers;
};

/** Creates the "Open in Discover" action for classic alert rows, opening Discover in data view mode. */
export const createClassicOpenInDiscoverAction = ({
  ruleTypeIds,
  resolvers,
  http,
  application,
  notifications,
  discoverLocator,
}: ClassicOpenInDiscoverActionDeps): EpisodeAction => {
  const getDiscoverHref = async (episode: AlertEpisode): Promise<string | undefined> => {
    if (!discoverLocator) return undefined;

    const { alertUuid } = getActionContext(episode);
    const alert = await fetchClassicAlertById({ ruleTypeIds, id: alertUuid, services: { http } });
    const target = getClassicAlertDiscoverTarget(alert, resolvers);

    if (!target) return undefined;
    if ('url' in target) return target.url;

    const { locatorParams } = target;

    return discoverLocator.getRedirectUrl({
      ...locatorParams,
      timeRange:
        locatorParams.timeRange ?? getDiscoverTimeRangeAroundTimestamp(episode.first_timestamp),
    });
  };

  return {
    id: CLASSIC_OPEN_IN_DISCOVER_ACTION_ID,
    order: 50,
    displayName: i18n.OPEN_IN_DISCOVER,
    iconType: 'productDiscover',
    enforcesOwnPrivileges: true,
    isCompatible: ({ episodes }) => {
      if (episodes.length !== 1 || !discoverLocator) return false;

      const [episode] = episodes;
      if (!isSourceEpisode(episode)) return false;

      return hasDiscoverLinkResolver(resolvers, getActionContext(episode).ruleTypeId);
    },
    execute: async ({ episodes }) => {
      const [episode] = episodes;

      let href: string | undefined;
      try {
        href = await getDiscoverHref(episode);
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
    },
  };
};
