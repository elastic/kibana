/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

/** Connector types an `ai.prompt` step can run on. */
const AI_CONNECTOR_TYPE_IDS = new Set(['.gen-ai', '.bedrock', '.gemini', '.inference']);

export interface AiConnector {
  id: string;
  name: string;
  connectorTypeId: string;
}

interface ConnectorResponse {
  id: string;
  name: string;
  connector_type_id: string;
}

/** The AI connectors the user can see, to choose the model an automation runs on. */
export const useAiConnectors = () => {
  const {
    services: { http },
  } = useKibana();

  return useQuery({
    queryKey: ['context_engine', 'ai_connectors'],
    queryFn: async ({ signal }) => {
      const connectors = await http.get<ConnectorResponse[]>('/api/actions/connectors', {
        ...(signal ? { signal } : {}),
      });
      return connectors
        .filter(({ connector_type_id: type }) => AI_CONNECTOR_TYPE_IDS.has(type))
        .map(
          ({ id, name, connector_type_id: connectorTypeId }): AiConnector => ({
            id,
            name,
            connectorTypeId,
          })
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    refetchOnWindowFocus: false,
  });
};
