/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { ApplicationStart, DocLinksStart, IUiSettingsClient } from '@kbn/core/public';
import type { CoreStart, OverlayStart } from '@kbn/core/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { getBreachEsqlQuery, type FindRulesResponse } from '@kbn/alerting-v2-schemas';
import { createEpisodeActions, type EpisodeAction } from '../actions';
import { useAdditionalEpisodesDataSource } from '../context/episode_data_source_context';
import {
  canOpenDiscover,
  getDiscoverHrefForAlertEventsHistory,
  getDiscoverHrefForRuleAndAlertTimestamp,
} from '../utils/discover_href_for_alert';
import {
  filterAlertActionsByPrivilege,
  ALERT_ACTIONS_PRIVILEGE,
} from '../utils/filter_alert_actions_by_privilege';

type Rule = FindRulesResponse['items'][number];

export interface UseEpisodeActionsServices {
  application: ApplicationStart;
  docLinks: DocLinksStart;
  expressions: ExpressionsStart;
  http: HttpStart;
  notifications: NotificationsStart;
  overlays: OverlayStart;
  rendering: CoreStart['rendering'];
  share: SharePluginStart;
  spaces: SpacesPluginStart;
  uiSettings: IUiSettingsClient;
  userProfile: CoreStart['userProfile'];
}

export interface UseEpisodeActionsOptions {
  services: UseEpisodeActionsServices;
  rulesCache: Record<string, Rule>;
  canWriteAlerts?: boolean;
}

export const useEpisodeActions = ({
  services,
  rulesCache,
  canWriteAlerts,
}: UseEpisodeActionsOptions): EpisodeAction[] => {
  const queryClient = useQueryClient();
  const additionalDataSource = useAdditionalEpisodesDataSource();

  return useMemo(
    () =>
      filterAlertActionsByPrivilege(
        createEpisodeActions({
          http: services.http,
          overlays: services.overlays,
          notifications: services.notifications,
          rendering: services.rendering,
          application: services.application,
          userProfile: services.userProfile,
          docLinks: services.docLinks,
          expressions: services.expressions,
          spaces: services.spaces,
          queryClient,
          additionalDataSource,
          isRuleAvailable: (ruleId) => Boolean(rulesCache[ruleId]),
          getDiscoverHref: ({ episodeIsoTimestamp, ruleId }) =>
            getDiscoverHrefForRuleAndAlertTimestamp({
              share: services.share,
              capabilities: services.application.capabilities,
              uiSettings: services.uiSettings,
              ruleEsql: rulesCache[ruleId]?.query
                ? getBreachEsqlQuery(rulesCache[ruleId]!.query)
                : undefined,
              alertIsoTimestamp: episodeIsoTimestamp,
            }),
          getAlertEventsHistoryHref: ({ episodeId, episodeStart, spaceId }) =>
            getDiscoverHrefForAlertEventsHistory({
              share: services.share,
              capabilities: services.application.capabilities,
              uiSettings: services.uiSettings,
              episodeId,
              episodeStart,
              spaceId,
            }),
          isAlertEventsHistoryAvailable: () =>
            canOpenDiscover({
              share: services.share,
              capabilities: services.application.capabilities,
              uiSettings: services.uiSettings,
            }),
        }),
        canWriteAlerts ? ALERT_ACTIONS_PRIVILEGE.all : ALERT_ACTIONS_PRIVILEGE.read
      ),
    [services, queryClient, additionalDataSource, rulesCache, canWriteAlerts]
  );
};
