/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_BASE_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
} from '@kbn/deeplinks-observability';
import type { EpisodeDataSource } from '@kbn/alerting-v2-episodes-ui/types/episode_data_source';
import type { AlertDiscoverLinkResolvers } from '@kbn/alerting-v2-episodes-ui/utils/discover_href_for_alert';
import { createClassicEpisodeSource } from '@kbn/alerting-v2-episodes-ui/classic_alerts/create_classic_episode_source';
import { CLASSIC_OBS_AND_STACK_RULE_TYPE_IDS } from '@kbn/alerting-v2-episodes-ui/classic_alerts/constants';

export { CLASSIC_OBS_AND_STACK_RULE_TYPE_IDS };

/** Classic alerts source; `discoverLinkResolvers` are added to the stack Discover resolvers. */
export const createClassicAlertsDataSource = (
  discoverLinkResolvers?: AlertDiscoverLinkResolvers
): EpisodeDataSource =>
  createClassicEpisodeSource({
    ruleTypeIds: CLASSIC_OBS_AND_STACK_RULE_TYPE_IDS,
    host: {
      app: OBSERVABILITY_ALERTING_APP_ID,
      pathPrefix: OBSERVABILITY_ALERTING_RULES_V1_PATH,
      appBasePath: OBSERVABILITY_ALERTING_BASE_PATH,
    },
    discoverLinkResolvers,
  });

export const CLASSIC_ALERTS_DATA_SOURCE: EpisodeDataSource = createClassicAlertsDataSource();
