/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import type { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';

export interface AlertQueryState {
  loading: boolean;
  error: string | null;
  alert: EcsFieldsResponse | null;
}

export function useAlertQuery() {
  const {
    services: { http },
  } = useKibana();
  const [state, setState] = useState<AlertQueryState>({
    loading: false,
    error: null,
    alert: null,
  });

  const fetchAlert = useCallback(
    async (alertId: string): Promise<EcsFieldsResponse | null> => {
      if (!alertId || !alertId.trim()) {
        setState({ loading: false, error: 'Alert ID is empty', alert: null });
        return null;
      }

      if (!http) {
        setState({ loading: false, error: 'HTTP service not available', alert: null });
        return null;
      }

      setState({ loading: true, error: null, alert: null });

      try {
        const alert = await http.get<EcsFieldsResponse>(BASE_RAC_ALERTS_API_PATH, {
          query: {
            id: alertId,
          },
        });

        setState({
          loading: false,
          error: null,
          alert,
        });
        return alert;
      } catch (error) {
        let errorMessage = 'Unknown error occurred';

        if (error instanceof Error) {
          errorMessage = error.message;
          // Try to extract more meaningful error from Elasticsearch responses
          if ('body' in error && typeof error.body === 'object' && error.body !== null) {
            const body = error.body as any;
            if (body.error?.reason) {
              errorMessage = body.error.reason;
            } else if (body.message) {
              errorMessage = body.message;
            } else if (body.error?.caused_by?.reason) {
              errorMessage = body.error.caused_by.reason;
            }
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String(error.message);
        }

        setState({
          loading: false,
          error: errorMessage,
          alert: null,
        });
        return null;
      }
    },
    [http]
  );

  return {
    ...state,
    fetchAlert,
  };
}

