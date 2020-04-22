/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useCallback, useReducer } from 'react';
import { getCaseConfigure, patchCaseConfigure, postCaseConfigure } from './api';

import { useStateToaster, errorToToaster, displaySuccessToast } from '../../../components/toasters';
import * as i18n from './translations';
import { CasesConfigurationMapping, ClosureType } from './types';

export interface State {
  closureType: ClosureType;
  connectorId: string;
  currentConfiguration: CurrentConfiguration;
  firstLoad: boolean;
  loading: boolean;
  mapping: CasesConfigurationMapping[] | null;
  persistLoading: boolean;
  version: string;
}

export interface CurrentConfiguration {
  connectorId: State['connectorId'];
  closureType: State['closureType'];
}
export type Action =
  | {
      type: 'setCurrentConfiguration';
      currentConfiguration: CurrentConfiguration;
    }
  | {
      type: 'setConnectorId';
      connectorId: string;
    }
  | {
      type: 'setLoading';
      payload: boolean;
    }
  | {
      type: 'setFirstLoad';
      payload: boolean;
    }
  | {
      type: 'setPersistLoading';
      payload: boolean;
    }
  | {
      type: 'setVersion';
      payload: string;
    }
  | {
      type: 'setClosureType';
      closureType: ClosureType;
    }
  | {
      type: 'setMapping';
      mapping: CasesConfigurationMapping[];
    };

export const configureCasesReducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'setLoading':
      return {
        ...state,
        loading: action.payload,
      };
    case 'setFirstLoad':
      return {
        ...state,
        firstLoad: action.payload,
      };
    case 'setPersistLoading':
      return {
        ...state,
        persistLoading: action.payload,
      };
    case 'setVersion':
      return {
        ...state,
        version: action.payload,
      };
    case 'setCurrentConfiguration': {
      return {
        ...state,
        currentConfiguration: { ...action.currentConfiguration },
      };
    }
    case 'setConnectorId': {
      return {
        ...state,
        connectorId: action.connectorId,
      };
    }
    case 'setClosureType': {
      return {
        ...state,
        closureType: action.closureType,
      };
    }
    case 'setMapping': {
      return {
        ...state,
        mapping: action.mapping,
      };
    }
    default:
      return state;
  }
};

export interface PersistCaseConfigure {
  closureType: ClosureType;
  connectorId: string;
  connectorName: string;
}

export interface ReturnUseCaseConfigure extends State {
  persistCaseConfigure: ({
    connectorId,
    connectorName,
    closureType,
  }: PersistCaseConfigure) => unknown;
  refetchCaseConfigure: () => void;
  setClosureType: (newClosureType: ClosureType) => void;
  setConnector: (newConnectorId: string) => void;
  setCurrentConfiguration: (configuration: CurrentConfiguration) => void;
  setMapping: (newMapping: CasesConfigurationMapping[]) => void;
}

export const initialState: State = {
  closureType: 'close-by-user',
  connectorId: 'none',
  currentConfiguration: {
    closureType: 'close-by-user',
    connectorId: 'none',
  },
  firstLoad: false,
  loading: true,
  mapping: null,
  persistLoading: false,
  version: '',
};

export const useCaseConfigure = (): ReturnUseCaseConfigure => {
  const [state, dispatch] = useReducer(configureCasesReducer, initialState);

  const setCurrentConfiguration = useCallback((configuration: CurrentConfiguration) => {
    dispatch({
      currentConfiguration: configuration,
      type: 'setCurrentConfiguration',
    });
  }, []);

  const setConnector = useCallback((newConnectorId: string) => {
    dispatch({
      connectorId: newConnectorId,
      type: 'setConnectorId',
    });
  }, []);

  const setClosureType = useCallback((newClosureType: ClosureType) => {
    dispatch({
      closureType: newClosureType,
      type: 'setClosureType',
    });
  }, []);

  const setMapping = useCallback((newMapping: CasesConfigurationMapping[]) => {
    dispatch({
      mapping: newMapping,
      type: 'setMapping',
    });
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({
      payload: isLoading,
      type: 'setLoading',
    });
  }, []);

  const setFirstLoad = useCallback((isFirstLoad: boolean) => {
    dispatch({
      payload: isFirstLoad,
      type: 'setFirstLoad',
    });
  }, []);

  const setPersistLoading = useCallback((isPersistLoading: boolean) => {
    dispatch({
      payload: isPersistLoading,
      type: 'setPersistLoading',
    });
  }, []);

  const setVersion = useCallback((version: string) => {
    dispatch({
      payload: version,
      type: 'setVersion',
    });
  }, []);

  const [, dispatchToaster] = useStateToaster();

  const refetchCaseConfigure = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();

    const fetchCaseConfiguration = async () => {
      try {
        setLoading(true);
        const res = await getCaseConfigure({ signal: abortCtrl.signal });
        if (!didCancel) {
          if (res != null) {
            setConnector(res.connectorId);
            if (setClosureType != null) {
              setClosureType(res.closureType);
            }
            setVersion(res.version);

            if (!state.firstLoad) {
              setFirstLoad(true);
              if (setCurrentConfiguration != null) {
                setCurrentConfiguration({
                  closureType: res.closureType,
                  connectorId: res.connectorId,
                });
              }
            }
          }
          setLoading(false);
        }
      } catch (error) {
        if (!didCancel) {
          setLoading(false);
          errorToToaster({
            dispatchToaster,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            title: i18n.ERROR_TITLE,
          });
        }
      }
    };

    fetchCaseConfiguration();

    return () => {
      didCancel = true;
      abortCtrl.abort();
    };
  }, [state.firstLoad]);

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
            state.version.length === 0
              ? await postCaseConfigure(connectorObj, abortCtrl.signal)
              : await patchCaseConfigure(
                  {
                    ...connectorObj,
                    version: state.version,
                  },
                  abortCtrl.signal
                );
          if (!didCancel) {
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
            setPersistLoading(false);
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
    [state.version]
  );

  useEffect(() => {
    refetchCaseConfigure();
  }, []);

  return {
    ...state,
    refetchCaseConfigure,
    persistCaseConfigure,
    setCurrentConfiguration,
    setConnector,
    setClosureType,
    setMapping,
  };
};
