/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { InferenceConnectorsResponse } from '../../common/types';
import { INFERENCE_CONNECTORS_QUERY_KEY } from '../../common/constants';
import { useKibana } from './use_kibana';

const INFERENCE_CONNECTORS_API = '/internal/inference/connectors';

export const useConnectors = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: [INFERENCE_CONNECTORS_QUERY_KEY],
    queryFn: async () => {
      const response = await services.http.get<InferenceConnectorsResponse>(
        INFERENCE_CONNECTORS_API,
        {}
      );

      return response.connectors;
    },
  });
};
