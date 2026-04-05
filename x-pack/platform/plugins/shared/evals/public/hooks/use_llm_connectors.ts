/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useEvalsApi } from './use_evals_api';

const AI_CONNECTOR_TYPES = new Set(['.gen-ai', '.bedrock', '.gemini', '.inference']);

// Raw API response uses snake_case
interface RawActionConnector {
  id: string;
  name: string;
  connector_type_id: string;
  is_preconfigured: boolean;
  is_missing_secrets: boolean;
  config?: Record<string, unknown>;
}

export interface LLMConnector {
  id: string;
  name: string;
  actionTypeId: string;
  isPreconfigured: boolean;
}

export const useLLMConnectors = () => {
  const { http } = useEvalsApi();

  return useQuery({
    queryKey: ['aesop', 'llm-connectors'],
    queryFn: async (): Promise<LLMConnector[]> => {
      const connectors = await http.get<RawActionConnector[]>('/api/actions/connectors');
      return connectors
        .filter((c) => AI_CONNECTOR_TYPES.has(c.connector_type_id) && !c.is_missing_secrets)
        .map((c) => ({
          id: c.id,
          name: c.name,
          actionTypeId: c.connector_type_id,
          isPreconfigured: c.is_preconfigured,
        }));
    },
    staleTime: 60_000,
  });
};
