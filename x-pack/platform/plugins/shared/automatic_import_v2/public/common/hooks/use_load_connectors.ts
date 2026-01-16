/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from './use_kibana';
import * as i18n from './translations';

const ALLOWED_ACTION_TYPE_IDS = ['.bedrock', '.gen-ai', '.gemini', '.inference'];

interface UseLoadConnectorsResult {
  connectors: ActionConnector[];
  isLoading: boolean;
  error: string | undefined;
  refetch: () => void;
}

export const useLoadConnectors = (): UseLoadConnectorsResult => {
  const { http, notifications } = useKibana().services;
  const [connectors, setConnectors] = useState<ActionConnector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const fetchConnectors = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      const response = await http.get<ActionConnector[]>('/api/actions/connectors');

      // Filter to only AI-related connectors
      const aiConnectors = response.filter((connector) => {
        const typeId = connector.actionTypeId || (connector as any).connector_type_id;
        return ALLOWED_ACTION_TYPE_IDS.includes(typeId);
      });

      setConnectors(aiConnectors);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : i18n.LOAD_CONNECTORS_ERROR_MESSAGE;
      setError(errorMessage);
      notifications.toasts.addDanger({
        title: i18n.LOAD_CONNECTORS_ERROR_TITLE,
        text: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [http, notifications.toasts]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  return {
    connectors,
    isLoading,
    error,
    refetch: fetchConnectors,
  };
};
