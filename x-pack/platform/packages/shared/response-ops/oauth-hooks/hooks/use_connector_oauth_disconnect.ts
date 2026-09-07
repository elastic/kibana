/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { INTERNAL_BASE_ACTION_API_PATH } from '@kbn/actions-plugin/common';
import type { HttpStart } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export interface ConnectorOAuthDisconnectProps {
  connectorId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface ConnectorOAuthDisconnect {
  disconnect: () => void;
  isDisconnecting: boolean;
}

/**
 * Disconnects a connector from its OAuth authorization by removing all stored
 * access and refresh tokens (via `disconnect()`).
 */
export const useConnectorOAuthDisconnect = ({
  connectorId,
  onSuccess,
  onError,
}: ConnectorOAuthDisconnectProps): ConnectorOAuthDisconnect => {
  const {
    services: { http },
  } = useKibana<{ http: HttpStart }>();

  const { mutate: disconnect, isLoading: isDisconnecting } = useMutation<void, Error>({
    mutationFn: () =>
      http.post(
        `${INTERNAL_BASE_ACTION_API_PATH}/connector/${encodeURIComponent(
          connectorId
        )}/_oauth_disconnect`
      ),
    onSuccess: () => onSuccess?.(),
    onError: (error) => onError?.(error),
  });

  return {
    disconnect,
    isDisconnecting,
  };
};
