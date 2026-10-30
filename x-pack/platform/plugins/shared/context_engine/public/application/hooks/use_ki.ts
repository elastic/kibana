/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { GetKiResponse } from '../../../common/http_api/knowledge_indicators';
import { createKiQueryOptions } from './ki_query_options';
import { useKibana } from './use_kibana';

interface UseKiArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
  enabled?: boolean;
}

interface UseKiResult {
  ki: GetKiResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

export const useKi = ({ aiIndexId, kiId, index, enabled = true }: UseKiArgs): UseKiResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error } = useQuery<GetKiResponse, Error>({
    ...createKiQueryOptions(http, { aiIndexId, kiId, index }),
    enabled: enabled && index.length > 0,
  });

  return {
    ki: data,
    isLoading,
    error: error ?? undefined,
  };
};
