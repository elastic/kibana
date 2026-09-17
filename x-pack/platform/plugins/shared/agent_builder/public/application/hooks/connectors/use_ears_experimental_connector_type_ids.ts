/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { fetchConnectorTypes } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector_types';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

export const useEarsExperimentalConnectorTypeIds = (): Set<string> => {
  const { http } = useKibana().services;
  const { data } = useQuery({
    queryKey: ['connectorTypes'],
    queryFn: () => fetchConnectorTypes({ http }),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(
    () => new Set((data ?? []).filter((type) => type.isEarsExperimental).map((type) => type.id)),
    [data]
  );
};
