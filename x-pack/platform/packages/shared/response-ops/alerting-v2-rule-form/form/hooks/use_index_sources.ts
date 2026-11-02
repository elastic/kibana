/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';
import { getESQLSources } from '@kbn/esql-utils';
import type { EsqlDatasetsResult } from '@kbn/esql-types';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { ruleFormKeys } from './query_key_factory';

interface UseIndexSourcesParams {
  http: HttpStart;
  application: ApplicationStart;
  getDatasets?: () => Promise<EsqlDatasetsResult>;
}

const STALE_TIME = 30_000;

export const useIndexSources = ({ http, application, getDatasets }: UseIndexSourcesParams) => {
  const query = useQuery({
    queryKey: [...ruleFormKeys.indexSources(), { withDatasets: Boolean(getDatasets) }],
    queryFn: async () => {
      const [sourcesSettled, datasetsSettled] = await Promise.allSettled([
        getESQLSources({ application, http }, undefined),
        getDatasets ? getDatasets() : Promise.resolve<EsqlDatasetsResult>({ datasets: [] }),
      ]);

      const sources = sourcesSettled.status === 'fulfilled' ? sourcesSettled.value : [];
      const datasetsResult =
        datasetsSettled.status === 'fulfilled'
          ? datasetsSettled.value
          : ({ datasets: [] } as EsqlDatasetsResult);

      const indexOptions = sources
        .filter((s) => !s.hidden && s.type !== SOURCES_TYPES.INTEGRATION)
        .map((s) => ({ label: s.name }));

      if (!getDatasets) return indexOptions;

      const indexNames = new Set(indexOptions.map((o) => o.label));
      const datasetOptions = (datasetsResult?.datasets ?? [])
        .filter((d) => !indexNames.has(d.name))
        .map((d) => ({ label: d.name }));

      return [...indexOptions, ...datasetOptions];
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
