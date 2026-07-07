/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, HttpSetup } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';
import { getESQLSources } from '@kbn/esql-utils';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { ruleFormKeys } from './query_key_factory';

interface UseIndexSourcesParams {
  http: HttpSetup;
  application: ApplicationStart;
}

const STALE_TIME = 30_000;

export const useIndexSources = ({ http, application }: UseIndexSourcesParams) => {
  const query = useQuery({
    queryKey: ruleFormKeys.indexSources(),
    queryFn: async () => {
      const sources = await getESQLSources({ application, http }, undefined);
      return sources
        .filter((s) => !s.hidden && s.type !== SOURCES_TYPES.INTEGRATION)
        .map((s) => ({ label: s.name }));
    },
    refetchOnWindowFocus: false,
    staleTime: STALE_TIME,
    retry: 1,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isFetching,
  };
};
