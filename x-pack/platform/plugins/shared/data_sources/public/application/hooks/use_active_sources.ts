/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { API_BASE_PATH } from '../../../common/constants';
import type { ActiveSource } from '../../types/connector';
import { queryKeys } from '../query_keys';

interface ListDataSourcesResponse {
  dataSources: ActiveSource[];
  total: number;
}

export const useActiveSources = () => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error } = useQuery(queryKeys.dataSources.list(), async () => {
    return await http.get<ListDataSourcesResponse>(API_BASE_PATH);
  });

  return {
    activeSources: data?.dataSources ?? [],
    isLoading,
    error,
  };
};
