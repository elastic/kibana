/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { MergeCaseSnapshot } from '../../common/types/domain';
import { bulkGetCases } from '../api';
import { useKibana } from '../common/lib/kibana';
import type { ServerError } from '../types';
import { casesQueriesKeys } from './constants';

/**
 * Resolves the number and title of the cases that other cases were merged into. Destinations the
 * user can't read are left out.
 */
export const useGetMergeDestinations = (
  ids: string[],
  { enabled = true }: { enabled?: boolean } = {}
) => {
  const { http } = useKibana().services;
  const uniqueIds = [...new Set(ids)].sort();

  return useQuery<Map<string, MergeCaseSnapshot>, ServerError>(
    casesQueriesKeys.mergeDestinations(uniqueIds),
    async ({ signal }) => {
      const { cases } = await bulkGetCases({ http, signal, params: { ids: uniqueIds } });
      return new Map(
        cases.map(({ id, title, incremental_id: incrementalId }) => [
          id,
          { id, title, incrementalId: incrementalId ?? null },
        ])
      );
    },
    { enabled: enabled && uniqueIds.length > 0, staleTime: 60 * 1000 }
  );
};
