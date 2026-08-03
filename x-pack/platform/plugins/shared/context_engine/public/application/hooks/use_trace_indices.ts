/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ListTraceIndicesResponse } from '../../../common/http_api/patterns';
import { listTraceIndices } from '../api/patterns';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/** Lists indices / data streams matching `traces-*`, for the self-improvement picker. */
export const useTraceIndices = (enabled: boolean) => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading } = useQuery<ListTraceIndicesResponse, Error>({
    queryKey: contextEngineQueryKeys.traceIndices(),
    queryFn: ({ signal }) => listTraceIndices(http, { signal }),
    enabled,
  });

  return { traceIndices: data?.indices ?? [], isLoading };
};
