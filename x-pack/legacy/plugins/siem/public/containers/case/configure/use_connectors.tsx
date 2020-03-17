/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useCallback } from 'react';

import { useStateToaster, errorToToaster } from '../../../components/toasters';
import * as i18n from '../translations';
import { fetchConnectors, patchConfigConnector } from './api';
import { CasesConfigurationMapping, Connector } from './types';

export interface ReturnConnectors {
  loading: boolean;
  connectors: Connector[];
  refetchConnectors: () => void;
  updateConnector: (connectorId: string, mappings: CasesConfigurationMapping[]) => unknown;
}

export const useConnectors = (): ReturnConnectors => {
  const [, dispatchToaster] = useStateToaster();
  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState<Connector[]>([]);

  const refetchConnectors = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();
    const getConnectors = async () => {
      try {
        setLoading(true);
        const res = await fetchConnectors({ signal: abortCtrl.signal });
        if (!didCancel) {
          setLoading(false);
          setConnectors(res.data);
        }
      } catch (error) {
        if (!didCancel) {
          setLoading(false);
          setConnectors([]);
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
        }
      }
    };
    getConnectors();
    return () => {
      didCancel = true;
      abortCtrl.abort();
    };
  }, []);

  const updateConnector = useCallback(
    (connectorId: string, mappings: CasesConfigurationMapping[]) => {
      if (connectorId === 'none') {
        return;
      }

      let didCancel = false;
      const abortCtrl = new AbortController();
      const update = async () => {
        try {
          setLoading(true);
          await patchConfigConnector({
            connectorId,
            config: {
              cases_configuration: {
                mapping: mappings.map(m => ({
                  source: m.source,
                  target: m.target,
                  action_type: m.actionType,
                })),
              },
            },
            signal: abortCtrl.signal,
          });
          if (!didCancel) {
            setLoading(false);
            refetchConnectors();
          }
        } catch (error) {
          if (!didCancel) {
            setLoading(false);
            refetchConnectors();
            errorToToaster({
              title: i18n.ERROR_TITLE,
              error: error.body && error.body.message ? new Error(error.body.message) : error,
              dispatchToaster,
            });
          }
        }
      };
      update();
      return () => {
        didCancel = true;
        abortCtrl.abort();
      };
    },
    []
  );

  useEffect(() => {
    refetchConnectors();
  }, []);

  return {
    loading,
    connectors,
    refetchConnectors,
    updateConnector,
  };
};
