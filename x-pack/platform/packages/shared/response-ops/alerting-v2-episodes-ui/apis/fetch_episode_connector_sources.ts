/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Filter, TimeRange } from '@kbn/es-query';
import { isConnectorEpisodeSource } from '@kbn/alerting-v2-common-queries';
import {
  buildEpisodeConnectorSourceOptionsQuery,
  type EpisodeConnectorSourceOptionRow,
} from '../queries/episode_connector_source_options_query';
import { buildAlertEventsTimeRangeFilter } from '../utils/build_alert_events_time_range_filter';
import { executeEsqlQuery } from '../utils/execute_esql_query';

export interface FetchEpisodeConnectorSourcesParams {
  spaceId: string;
  timeRange?: TimeRange | null;
  abortSignal?: AbortSignal;
  services: { expressions: ExpressionsStart };
}

/**
 * Connector slugs on alert events in the time range. Empty, native, and reserved ids are dropped.
 */
export const fetchEpisodeConnectorSources = async ({
  spaceId,
  timeRange,
  abortSignal,
  services: { expressions },
}: FetchEpisodeConnectorSourcesParams): Promise<string[]> => {
  const query = buildEpisodeConnectorSourceOptionsQuery(spaceId).print('basic');
  const input: {
    type: 'kibana_context';
    esqlVariables: [];
    filters?: Filter[];
  } = {
    type: 'kibana_context',
    esqlVariables: [],
  };
  const timeRangeFilter = buildAlertEventsTimeRangeFilter(timeRange);
  if (timeRangeFilter) {
    input.filters = [timeRangeFilter];
  }

  const rows = await executeEsqlQuery<EpisodeConnectorSourceOptionRow>({
    expressions,
    query,
    input,
    abortSignal,
  });

  return rows.map(({ source }) => source).filter(isConnectorEpisodeSource);
};
