/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodeEventDataQuery as buildEpisodeEventDataQueryCommon } from '@kbn/alerting-v2-common-queries';

/**
 * ES|QL query that extracts the alert `data` object from the latest non-empty
 * `.rule-events` document for the given episode, alongside the timestamp of
 * that data event and the timestamp of the most recent event overall.
 */
export const buildEpisodeEventDataQuery = (spaceId: string, episodeId: string) =>
  buildEpisodeEventDataQueryCommon(spaceId, episodeId);
