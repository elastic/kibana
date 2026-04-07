/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import { queryKeys } from '../query_keys';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { buildDeactivatedGroupHashesQuery } from '../utils/queries/build_deactivated_group_hashes_query';

export interface UseFetchDeactivatedGroupHashesOptions {
  enabled: boolean;
  services: { expressions: ExpressionsStart };
}

/**
 * Fetches the set of group hashes that are currently deactivated (resolved).
 * Only enabled when a status filter is active, since deactivation state
 * is irrelevant when no status filter is applied.
 */
export const useFetchDeactivatedGroupHashes = ({
  enabled,
  services,
}: UseFetchDeactivatedGroupHashesOptions) =>
  useQuery({
    queryKey: queryKeys.deactivatedGroupHashes(),
    queryFn: async ({ signal }) => {
      const query = buildDeactivatedGroupHashesQuery();
      const result = await executeEsqlQuery({
        expressions: services.expressions,
        query,
        input: null,
        abortSignal: signal,
        noCache: true,
      });
      return result.rows.map((row) => row.group_hash as string);
    },
    enabled,
    keepPreviousData: true,
  });
