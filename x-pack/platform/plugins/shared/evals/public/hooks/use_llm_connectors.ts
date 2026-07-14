/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';

const ALLOWED_CONNECTOR_TYPE_IDS = new Set(['.gen-ai', '.bedrock', '.gemini', '.inference']);

interface ConnectorsApiResponseItem {
  id: string;
  name: string;
  connector_type_id: string;
}

export interface LlmConnector {
  id: string;
  name: string;
}

export const useLlmConnectors = () => {
  const { services } = useKibana();

  const { data, isLoading, error } = useQuery({
    queryKey: ['onlineEvalLlmConnectors'],
    queryFn: async (): Promise<LlmConnector[]> => {
      const response = await services.http!.get<ConnectorsApiResponseItem[]>(
        '/api/actions/connectors'
      );
      return response
        .filter((connector) => ALLOWED_CONNECTOR_TYPE_IDS.has(connector.connector_type_id))
        .map((connector) => ({
          id: connector.id,
          name: connector.name,
        }));
    },
  });

  return {
    connectors: data ?? [],
    isLoading,
    error,
  };
};
