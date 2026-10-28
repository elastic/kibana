/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { fetchEpisodeConnectorSources } from '../apis/fetch_episode_connector_sources';
import { useQueryV2Source } from '../context/episode_data_source_context';
import { queryKeys } from '../query_keys';
import { useSpaceId } from './use_space_id';

export interface UseFetchEpisodeConnectorSourcesParams {
  services: { expressions: ExpressionsStart; spaces: SpacesPluginStart };
  timeRange?: TimeRange | null;
}

/** Connector names in the current time range. Empty when the v2 source is not queried. */
export const useFetchEpisodeConnectorSources = ({
  services,
  timeRange,
}: UseFetchEpisodeConnectorSourcesParams) => {
  const queryV2Source = useQueryV2Source();
  const spaceId = useSpaceId(services.spaces);
  return useQuery({
    queryKey: queryKeys.connectorSources(spaceId, timeRange ?? undefined, queryV2Source),
    queryFn: ({ signal }) => {
      if (!queryV2Source) {
        return [];
      }
      return fetchEpisodeConnectorSources({
        spaceId,
        timeRange,
        services,
        abortSignal: signal,
      });
    },
  });
};
