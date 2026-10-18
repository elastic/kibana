/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { InferenceConnectorType } from '@kbn/inference-common';

const CHAT_COMPLETION_TASK_TYPE = 'chat_completion';

export interface ModelConnector {
  id: string;
  name: string;
}

interface RawActionConnector {
  id: string;
  name: string;
  connector_type_id: string;
  is_deprecated?: boolean;
  config?: { taskType?: string };
}

const MODEL_CONNECTOR_TYPE_IDS = new Set<string>(Object.values(InferenceConnectorType));

/**
 * A `.inference` connector is only usable here when it resolves to a chat_completion endpoint;
 */
const isChatCapable = (connector: RawActionConnector): boolean =>
  connector.connector_type_id !== InferenceConnectorType.Inference ||
  connector.config?.taskType === CHAT_COMPLETION_TASK_TYPE;

export const useModelConnectors = () => {
  const { services } = useKibana();

  const { data, isLoading, error } = useQuery({
    queryKey: ['evals', 'model-connectors'],
    queryFn: async (): Promise<ModelConnector[]> => {
      const response = await services.http!.get<RawActionConnector[]>('/api/actions/connectors');
      const connectors = response.filter(
        (connector) => !connector.is_deprecated && isChatCapable(connector)
      );
      const modelConnectors = connectors.filter((connector) =>
        MODEL_CONNECTOR_TYPE_IDS.has(connector.connector_type_id)
      );

      // Fall back to showing all connectors if none match the known model types,
      // so unusual deployments can still pick a connector.
      const selectable = modelConnectors.length > 0 ? modelConnectors : connectors;

      return selectable.map(({ id, name }) => ({ id, name }));
    },
    refetchOnWindowFocus: false,
  });

  return {
    connectors: data ?? [],
    isLoading,
    error,
  };
};
