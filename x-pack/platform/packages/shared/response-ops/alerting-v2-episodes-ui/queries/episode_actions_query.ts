/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodeActionsQuery as buildEpisodeActionsQueryCommon } from '@kbn/alerting-v2-common-queries';
import type { EpisodeActionRow } from '@kbn/alerting-v2-common-queries';

export type AlertEpisodeAction = EpisodeActionRow;

export const buildEpisodeActionsQuery = (spaceId: string, episodeIds: string[]) =>
  buildEpisodeActionsQueryCommon(spaceId, episodeIds);
