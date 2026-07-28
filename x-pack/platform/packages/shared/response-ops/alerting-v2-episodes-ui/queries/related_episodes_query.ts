/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import {
  buildRelatedBaseQuery as buildRelatedBaseQueryCommon,
  finishRelatedEpisodesQuery as finishRelatedEpisodesQueryCommon,
  RELATED_EPISODE_FIELDS as RELATED_EPISODE_FIELDS_COMMON,
} from '@kbn/alerting-v2-common-queries';

export const RELATED_EPISODE_FIELDS = RELATED_EPISODE_FIELDS_COMMON;

export const finishRelatedEpisodesQuery = (query: ComposerQuery) =>
  finishRelatedEpisodesQueryCommon(query);

export const buildRelatedBaseQuery = (
  spaceId: string,
  ruleId: string,
  excludeEpisodeId: string
) => buildRelatedBaseQueryCommon(spaceId, ruleId, excludeEpisodeId);
