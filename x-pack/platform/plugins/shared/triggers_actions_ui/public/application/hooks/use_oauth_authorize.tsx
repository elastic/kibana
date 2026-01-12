/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { INTERNAL_BASE_ACTION_API_PATH } from '../constants';

interface OAuthAuthorizeResponse {
  authorizationUrl: string;
  state: string;
}

export function useOAuthAuthorize() {
  const { http } = useKibana().services;
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const authorize = useCallback(
    async (connectorId: string) => {
      setIsAuthorizing(true);
      try {
        const { authorizationUrl } = await http!.post<OAuthAuthorizeResponse>(
          `${INTERNAL_BASE_ACTION_API_PATH}/connector/${encodeURIComponent(
            connectorId
          )}/_start_oauth_flow`,
          {
            body: JSON.stringify({}),
          }
        );

        // Open authorization URL in a new tab
        window.open(authorizationUrl, '_blank', 'noopener,noreferrer');

        return true;
      } catch (error) {
        throw error;
      } finally {
        setIsAuthorizing(false);
      }
    },
    [http]
  );

  return {
    authorize,
    isAuthorizing,
  };
}
