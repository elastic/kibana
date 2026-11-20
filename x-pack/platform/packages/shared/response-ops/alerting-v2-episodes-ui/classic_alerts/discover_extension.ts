/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeDiscoverExtension } from '../types/episode_data_source';
import type { AlertDiscoverLinkResolvers } from '../utils/discover_href_for_alert';
import { OPEN_IN_DISCOVER_EPISODE_ACTION_ID } from '../actions/open_in_discover';
import { getActionContext } from './action_extensions';
import { fetchClassicAlertById } from './apis/fetch_classic_alert_by_id';
import {
  getClassicAlertDiscoverTarget,
  hasDiscoverLinkResolver,
} from './utils/get_classic_alert_discover_target';

/** Opens classic alert rows in Discover from the alert document, through the rule type's resolver. */
export const createClassicDiscoverExtension = ({
  ruleTypeIds,
  resolvers,
}: {
  ruleTypeIds: string[];
  resolvers: AlertDiscoverLinkResolvers;
}): EpisodeDiscoverExtension => ({
  actionId: OPEN_IN_DISCOVER_EPISODE_ACTION_ID,
  isCompatible: (ep) => hasDiscoverLinkResolver(resolvers, getActionContext(ep).ruleTypeId),
  getDiscoverTarget: async (ep, { http }) => {
    const { alertUuid } = getActionContext(ep);
    const alert = await fetchClassicAlertById({ ruleTypeIds, id: alertUuid, services: { http } });
    return getClassicAlertDiscoverTarget(alert, resolvers);
  },
});
