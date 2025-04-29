/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { useRef, useState, useEffect } from 'react';
import { executeAction } from '../lib/action_connector_api';
import { useKibana } from '../../common/lib/kibana';

interface UseExecuteConnectorReturnValue {
  isLoading: boolean;
  executeConnector: (args: {
    connectorId: string;
    params: Record<string, unknown>;
  }) => Promise<ActionTypeExecutorResult<unknown> | undefined>;
}

export const useExecuteConnector = (): UseExecuteConnectorReturnValue => {
  const { http } = useKibana().services;

  const [isLoading, setIsLoading] = useState(false);
  const abortCtrlRef = useRef(new AbortController());
  const isMounted = useRef(false);

  async function executeConnector({
    connectorId,
    params,
  }: {
    connectorId: string;
    params: Record<string, unknown>;
  }) {
    setIsLoading(true);
    isMounted.current = true;
    abortCtrlRef.current.abort();
    abortCtrlRef.current = new AbortController();

    try {
      const res = await executeAction({ http, id: connectorId, params });

      if (isMounted.current) {
        setIsLoading(false);
      }

      return res;
    } catch (error) {
      if (isMounted.current) {
        setIsLoading(false);

        if (error.name !== 'AbortError') {
          throw error;
        }
      }
    }
  }

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortCtrlRef.current.abort();
    };
  }, []);

  return { isLoading, executeConnector };
};
