/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Streams } from '@kbn/streams-schema';
import type { FailureStoreStatsResponse } from '@kbn/streams-schema/src/models/ingest/failure_store';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { getFailureStoreIndexName } from '../helpers/failure_store_index_name';

export type FailureStoreStats = FailureStoreStatsResponse & {
  bytesPerDay: number;
  bytesPerDoc: number;
};

export const useFailureStoreStats = ({
  definition,
}: {
  definition: Streams.ingest.all.GetResponse;
}) => {
  const {
    core: { http },
  } = useKibana();

  const statsFetch = useStreamsAppFetch(
    async () => {
      if (!definition.privileges?.manage_failure_store || !definition.failure_store) {
        return undefined;
      }

      const fsStats = await http.get<FailureStoreStatsResponse>(
        `/internal/streams/${getFailureStoreIndexName(definition)}/failure_store/stats`
      );

      if (!fsStats || !fsStats.creationDate) {
        return undefined;
      }

      const daysSinceCreation = Math.max(
        1,
        Math.round(moment().diff(moment(fsStats.creationDate), 'days'))
      );

      return {
        ...fsStats,
        bytesPerDay: fsStats.size && fsStats.count !== 0 ? fsStats.size / daysSinceCreation : 0,
        bytesPerDoc: fsStats.count && fsStats.size ? fsStats.size / fsStats.count : 0,
      };
    },
    [http, definition],
    {
      withTimeRange: false,
      withRefresh: true,
    }
  );

  return {
    stats: statsFetch.value,
    isLoading: statsFetch.loading,
    refresh: statsFetch.refresh,
    error: statsFetch.error,
  };
};
