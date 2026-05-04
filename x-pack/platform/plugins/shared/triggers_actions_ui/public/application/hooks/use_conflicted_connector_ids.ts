/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../common/lib/kibana';
import { getSkippedPreconfiguredConnectorIds } from '../lib/action_connector_api';

export const useSkippedPreconfiguredConnectorIds = () => {
  const { http } = useKibana().services;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['skippedPreconfiguredConnectorIds'],
    queryFn: () => getSkippedPreconfiguredConnectorIds({ http }),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  return {
    skippedPreconfiguredConnectorIds: data?.skippedPreconfiguredConnectorIds ?? [],
    isLoading,
    isError,
  };
};
