/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ListPatternCasesResponse } from '../../../common/http_api/patterns';
import { listPatternCases } from '../api/patterns';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/**
 * Lists a pattern's member cases (its suite / representative traces). Lazy:
 * only fetches when `enabled` (e.g. the pattern row is expanded).
 */
export const usePatternCases = (aiIndexId: string, patternKey: string, enabled: boolean) => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error } = useQuery<ListPatternCasesResponse, Error>({
    queryKey: contextEngineQueryKeys.patterns.cases(aiIndexId, patternKey),
    queryFn: ({ signal }) => listPatternCases(http, { aiIndexId, patternKey, signal }),
    enabled,
  });

  return { cases: data?.cases ?? [], isLoading, error: error ?? undefined };
};
