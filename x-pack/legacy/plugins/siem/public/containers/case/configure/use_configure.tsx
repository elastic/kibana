/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useCallback } from 'react';
import { getCaseConfigure, patchCaseConfigure, postCaseConfigure } from './api';

import { useStateToaster, errorToToaster, displaySuccessToast } from '../../../components/toasters';
import * as i18n from './translations';
import { ClosureType } from './types';
import { CurrentConfiguration } from '../../../pages/case/components/configure_cases/reducer';

interface PersistCaseConfigure {
  connectorId: string;
  connectorName: string;
  closureType: ClosureType;
}

export interface ReturnUseCaseConfigure {
  loading: boolean;
  refetchCaseConfigure: () => void;
  persistCaseConfigure: ({
    connectorId,
    connectorName,
    closureType,
  }: PersistCaseConfigure) => unknown;
  persistLoading: boolean;
}

interface UseCaseConfigure {
  setConnector: (newConnectorId: string, newConnectorName?: string) => void;
  setClosureType?: (newClosureType: ClosureType) => void;
  setCurrentConfiguration?: (configuration: CurrentConfiguration) => void;
}

export const useCaseConfigure = ({
  setConnector,
  setClosureType,
  setCurrentConfiguration,
}: UseCaseConfigure): ReturnUseCaseConfigure => {
  const [, dispatchToaster] = useStateToaster();
  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(false);
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
            setConnector(res.connectorId, res.connectorName);
            if (setClosureType != null) {
              setClosureType(res.closureType);
            }
            setVersion(res.version);

            if (!firstLoad) {
              setFirstLoad(true);
              if (setCurrentConfiguration != null) {
                setCurrentConfiguration({
                  connectorId: res.connectorId,
                  closureType: res.closureType,
                });
              }
            }
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
    async ({ connectorId, connectorName, closureType }: PersistCaseConfigure) => {
      let didCancel = false;
      const abortCtrl = new AbortController();
      const saveCaseConfiguration = async () => {
        try {
          setPersistLoading(true);
          const connectorObj = {
            connector_id: connectorId,
            connector_name: connectorName,
            closure_type: closureType,
          };
          const res =
            version.length === 0
              ? await postCaseConfigure(connectorObj, abortCtrl.signal)
              : await patchCaseConfigure(
                  {
                    ...connectorObj,
                    version,
                  },
                  abortCtrl.signal
                );
          if (!didCancel) {
            setPersistLoading(false);
            setConnector(res.connectorId);
            if (setClosureType) {
              setClosureType(res.closureType);
            }
            setVersion(res.version);
            if (setCurrentConfiguration != null) {
              setCurrentConfiguration({
                connectorId: res.connectorId,
                closureType: res.closureType,
              });
            }

            displaySuccessToast(i18n.SUCCESS_CONFIGURE, dispatchToaster);
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
