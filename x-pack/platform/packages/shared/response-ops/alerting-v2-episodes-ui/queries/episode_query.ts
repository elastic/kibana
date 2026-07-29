/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { buildEpisodeQuery as buildEpisodeQueryCommon } from '@kbn/alerting-v2-common-queries';

/**
 * Builds an ES|QL query that returns the single aggregated row for one episode,
 * reusing the same aggregation pipeline as the list query.
 */
export const buildEpisodeQuery = (spaceId: string, episodeId: string): ComposerQuery =>
  buildEpisodeQueryCommon(spaceId, episodeId);
