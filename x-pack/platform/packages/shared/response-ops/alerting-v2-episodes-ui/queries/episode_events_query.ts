/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEpisodeEventsQuery } from '@kbn/alerting-v2-common-queries';

/**
 * ES|QL query returning all events for a single alert episode, oldest first.
 */
export const buildEpisodeEventsEsqlQuery = (spaceId: string, episodeId: string) =>
  buildEpisodeEventsQuery(spaceId, episodeId);
