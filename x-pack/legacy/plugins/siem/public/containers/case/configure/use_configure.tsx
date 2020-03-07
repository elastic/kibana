/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useCallback } from 'react';
import { getCaseConfigure, patchCaseConfigure, postCaseConfigure } from './api';

import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../../components/toasters';
import * as i18n from '../translations';
import { ClosureType } from './types';

interface PersistCaseConfigure {
  connectorId: string;
  closureType: ClosureType;
}

export interface ReturnUseCaseConfigure {
  loading: boolean;
  refetchCaseConfigure: () => void;
  persistCaseConfigure: ({ connectorId, closureType }: PersistCaseConfigure) => Promise<unknown>;
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

  const refetchCaseConfigure = useCallback(async () => {
    let didCancel = false;
    const abortCtrl = new AbortController();
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
    return () => {
      didCancel = true;
      abortCtrl.abort();
    };
  }, []);

  const persistCaseConfigure = useCallback(
    async ({ connectorId, closureType }: PersistCaseConfigure) => {
      let didCancel = false;
      const abortCtrl = new AbortController();
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
        if (didCancel) {
          setPersistLoading(false);
          setConnectorId(res.connectorId);
          setClosureType(res.closureType);
          setVersion(res.version);
        }
      } catch (error) {
        if (didCancel) {
          setPersistLoading(false);
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
        }
      }
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
