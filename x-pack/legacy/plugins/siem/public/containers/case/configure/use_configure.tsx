/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useCallback } from 'react';
import { getCaseConfigure, patchCaseConfigure, postCaseConfigure } from './api';

import { useStateToaster, errorToToaster } from '../../../components/toasters';
import * as i18n from '../translations';
import { ClosureType } from './types';

interface PersistCaseConfigure {
  connectorId: string;
  closureType: ClosureType;
}

export interface ReturnUseCaseConfigure {
  loading: boolean;
  refetchCaseConfigure: () => void;
  persistCaseConfigure: ({ connectorId, closureType }: PersistCaseConfigure) => unknown;
  persistLoading: boolean;
}

interface UseCaseConfigure {
  setConnectorId: (newConnectorId: string) => void;
  setClosureType: (newClosureType: ClosureType) => void;
}

export const useCaseConfigure = ({
  setConnectorId,
  setClosureType,
}: UseCaseConfigure): ReturnUseCaseConfigure => {
  const [, dispatchToaster] = useStateToaster();
  const [loading, setLoading] = useState(true);
  const [persistLoading, setPersistLoading] = useState(false);
  const [version, setVersion] = useState('');

  const refetchCaseConfigure = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();

    const fetchCaseConfiguration = async () => {
      try {
        setLoading(true);
        const res = await getCaseConfigure({ signal: abortCtrl.signal });
        if (!didCancel) {
          setLoading(false);
          if (res != null) {
            setConnectorId(res.connectorId);
            setClosureType(res.closureType);
            setVersion(res.version);
          }
        }
      } catch (error) {
        if (!didCancel) {
          setLoading(false);
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
        }
      }
    };

    fetchCaseConfiguration();

    return () => {
      didCancel = true;
      abortCtrl.abort();
    };
  }, []);

  const persistCaseConfigure = useCallback(
    async ({ connectorId, closureType }: PersistCaseConfigure) => {
      let didCancel = false;
      const abortCtrl = new AbortController();
      const saveCaseConfiguration = async () => {
        try {
          setPersistLoading(true);
          const res =
            version.length === 0
              ? await postCaseConfigure(
                  { connector_id: connectorId, closure_type: closureType },
                  abortCtrl.signal
                )
              : await patchCaseConfigure(
                  { connector_id: connectorId, closure_type: closureType, version },
                  abortCtrl.signal
                );
          if (!didCancel) {
            setPersistLoading(false);
            setConnectorId(res.connectorId);
            setClosureType(res.closureType);
            setVersion(res.version);
          }
        } catch (error) {
          if (!didCancel) {
            setPersistLoading(false);
            errorToToaster({
              title: i18n.ERROR_TITLE,
              error: error.body && error.body.message ? new Error(error.body.message) : error,
              dispatchToaster,
            });
          }
        }
      };
      saveCaseConfiguration();
      return () => {
        didCancel = true;
        abortCtrl.abort();
      };
    },
    [version]
  );

  useEffect(() => {
    refetchCaseConfigure();
  }, []);

  return {
    loading,
    refetchCaseConfigure,
    persistCaseConfigure,
    persistLoading,
  };
};
