/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLoadConnectors as useLoadConnectorsBase } from '@kbn/elastic-assistant';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from './use_kibana';

interface UseLoadConnectorsResult {
  connectors: ActionConnector[];
  isLoading: boolean;
  error: string | undefined;
  refetch: () => void;
}

export const useLoadConnectors = (): UseLoadConnectorsResult => {
  const { http, notifications, settings } = useKibana().services;

  const { data, isLoading, error, refetch } = useLoadConnectorsBase({
    http,
    toasts: notifications.toasts,
    inferenceEnabled: true,
    settings,
  });

  return {
    connectors: data ?? [],
    isLoading,
    error: error?.message,
    refetch,
  };
};
