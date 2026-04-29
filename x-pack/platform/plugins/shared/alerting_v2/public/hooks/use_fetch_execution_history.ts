/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import {
  ExecutionHistoryApi,
  type PolicyExecutionHistoryResponse,
} from '../services/execution_history_api';
import { executionHistoryKeys } from './query_key_factory';

export const useFetchExecutionHistory = () => {
  const executionHistoryApi = useService(ExecutionHistoryApi);

  return useQuery<PolicyExecutionHistoryResponse, Error>({
    queryKey: executionHistoryKeys.list(),
    queryFn: () => executionHistoryApi.listExecutionHistory(),
    refetchOnWindowFocus: false,
  });
};
