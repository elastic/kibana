/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_EPISODE_ACTION_TYPE,
  createTagEpisodeActionBodySchema,
} from '@kbn/alerting-v2-schemas';
import { createTagEpisodeActionOasExamples } from './create_tag_episode_action_oas_example';
import { createEpisodeActionRouteForType } from './create_episode_action_route_for_type';

export const CreateTagEpisodeActionRoute = createEpisodeActionRouteForType({
  actionType: ALERT_EPISODE_ACTION_TYPE.TAG,
  pathSuffix: '_tag',
  summary: 'Tag an alert episode',
  bodySchema: createTagEpisodeActionBodySchema,
  oasOperationObject: createTagEpisodeActionOasExamples,
  access: 'public' as const,
});
