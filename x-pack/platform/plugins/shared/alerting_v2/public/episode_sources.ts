/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_RULE_TYPE_IDS, STACK_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import type { EpisodeDataSource } from '@kbn/alerting-v2-episodes-ui/types/episode_data_source';
import { createClassicEpisodeSource } from '@kbn/alerting-v2-episodes-ui/classic_alerts/create_classic_episode_source';

export const CLASSIC_ALERT_RULE_TYPE_IDS = Array.from(
  new Set([...OBSERVABILITY_RULE_TYPE_IDS, ...STACK_RULE_TYPE_IDS])
);

export const CLASSIC_EPISODES_DATA_SOURCE: EpisodeDataSource = createClassicEpisodeSource({
  ruleTypeIds: CLASSIC_ALERT_RULE_TYPE_IDS,
});
