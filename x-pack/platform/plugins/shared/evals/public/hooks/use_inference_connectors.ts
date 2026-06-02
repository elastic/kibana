/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';

const INFERENCE_CONNECTORS_URL = '/internal/inference/connectors';

export interface InferenceConnectorItem {
  connectorId: string;
  name: string;
  type: string;
}

interface GetInferenceConnectorsResponse {
  connectors: InferenceConnectorItem[];
}

export const useInferenceConnectors = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: ['evals', 'inference', 'connectors'],
    queryFn: async (): Promise<InferenceConnectorItem[]> => {
      try {
        const response = await services.http!.get<GetInferenceConnectorsResponse>(
          INFERENCE_CONNECTORS_URL
        );
        return response.connectors ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });
};
