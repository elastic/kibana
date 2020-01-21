/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import React, { useEffect, useReducer, Dispatch, createContext, useContext } from 'react';

import { usePrivilegeUser } from '../../../../containers/detection_engine/signals/use_privilege_user';
import { useSignalIndex } from '../../../../containers/detection_engine/signals/use_signal_index';
import { useKibana } from '../../../../lib/kibana';
import { useCreatePackagedRules } from '../../../../containers/detection_engine/rules/use_create_packaged_rules';

export interface State {
  canUserCRUD: boolean | null;
  hasIndexManage: boolean | null;
  hasIndexWrite: boolean | null;
  hasManageApiKey: boolean | null;
  isSignalIndexExists: boolean | null;
  isAuthenticated: boolean | null;
  loading: boolean;
  signalIndexName: string | null;
}

const initialState: State = {
  canUserCRUD: null,
  hasIndexManage: null,
  hasIndexWrite: null,
  hasManageApiKey: null,
  isSignalIndexExists: null,
  isAuthenticated: null,
  loading: true,
  signalIndexName: null,
};

export type Action =
  | { type: 'updateLoading'; loading: boolean }
  | {
      type: 'updateHasManageApiKey';
      hasManageApiKey: boolean | null;
    }
  | {
      type: 'updateHasIndexManage';
      hasIndexManage: boolean | null;
    }
  | {
      type: 'updateHasIndexWrite';
      hasIndexWrite: boolean | null;
    }
  | {
      type: 'updateIsSignalIndexExists';
      isSignalIndexExists: boolean | null;
    }
  | {
      type: 'updateIsAuthenticated';
      isAuthenticated: boolean | null;
    }
  | {
      type: 'updateCanUserCRUD';
      canUserCRUD: boolean | null;
    }
  | {
      type: 'updateSignalIndexName';
      signalIndexName: string | null;
    };

export const userInfoReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'updateLoading': {
      return {
        ...state,
        loading: action.loading,
      };
    }
    case 'updateHasIndexManage': {
      return {
        ...state,
        hasIndexManage: action.hasIndexManage,
      };
    }
    case 'updateHasIndexWrite': {
      return {
        ...state,
        hasIndexWrite: action.hasIndexWrite,
      };
    }
    case 'updateHasManageApiKey': {
      return {
        ...state,
        hasManageApiKey: action.hasManageApiKey,
      };
    }
    case 'updateIsSignalIndexExists': {
      return {
        ...state,
        isSignalIndexExists: action.isSignalIndexExists,
      };
    }
    case 'updateIsAuthenticated': {
      return {
        ...state,
        isAuthenticated: action.isAuthenticated,
      };
    }
    case 'updateCanUserCRUD': {
      return {
        ...state,
        canUserCRUD: action.canUserCRUD,
      };
    }
    case 'updateSignalIndexName': {
      return {
        ...state,
        signalIndexName: action.signalIndexName,
      };
    }
    default:
      return state;
  }
};

const StateUserInfoContext = createContext<[State, Dispatch<Action>]>([initialState, () => noop]);

const useUserData = () => useContext(StateUserInfoContext);

interface ManageUserInfoProps {
  children: React.ReactNode;
}

export const ManageUserInfo = ({ children }: ManageUserInfoProps) => (
  <StateUserInfoContext.Provider value={useReducer(userInfoReducer, initialState)}>
    {children}
  </StateUserInfoContext.Provider>
);

export const useUserInfo = (): State => {
  const [
    {
      canUserCRUD,
      hasIndexManage,
      hasIndexWrite,
      hasManageApiKey,
      isSignalIndexExists,
      isAuthenticated,
      loading,
      signalIndexName,
    },
    dispatch,
  ] = useUserData();
  const {
    loading: privilegeLoading,
    isAuthenticated: isApiAuthenticated,
    hasIndexManage: hasApiIndexManage,
    hasIndexWrite: hasApiIndexWrite,
    hasManageApiKey: hasApiManageApiKey,
  } = usePrivilegeUser();
  const [
    indexNameLoading,
    isApiSignalIndexExists,
    apiSignalIndexName,
    createSignalIndex,
  ] = useSignalIndex();

  useCreatePackagedRules({
    canUserCRUD,
    hasIndexManage,
    hasManageApiKey,
    isAuthenticated,
    isSignalIndexExists,
  });

  const uiCapabilities = useKibana().services.application.capabilities;
  const capabilitiesCanUserCRUD: boolean =
    typeof uiCapabilities.siem.crud === 'boolean' ? uiCapabilities.siem.crud : false;

  useEffect(() => {
    if (loading !== privilegeLoading || indexNameLoading) {
      dispatch({ type: 'updateLoading', loading: privilegeLoading || indexNameLoading });
    }
  }, [loading, privilegeLoading, indexNameLoading]);

  useEffect(() => {
    if (hasIndexManage !== hasApiIndexManage && hasApiIndexManage != null) {
      dispatch({ type: 'updateHasIndexManage', hasIndexManage: hasApiIndexManage });
    }
  }, [hasIndexManage, hasApiIndexManage]);

  useEffect(() => {
    if (hasIndexWrite !== hasApiIndexWrite && hasApiIndexWrite != null) {
      dispatch({ type: 'updateHasIndexWrite', hasIndexWrite: hasApiIndexWrite });
    }
  }, [hasIndexWrite, hasApiIndexWrite]);

  useEffect(() => {
    if (hasManageApiKey !== hasApiManageApiKey && hasApiManageApiKey != null) {
      dispatch({ type: 'updateHasManageApiKey', hasManageApiKey: hasApiManageApiKey });
    }
  }, [hasManageApiKey, hasApiManageApiKey]);

  useEffect(() => {
    if (isSignalIndexExists !== isApiSignalIndexExists && isApiSignalIndexExists != null) {
      dispatch({ type: 'updateIsSignalIndexExists', isSignalIndexExists: isApiSignalIndexExists });
    }
  }, [isSignalIndexExists, isApiSignalIndexExists]);

  useEffect(() => {
    if (isAuthenticated !== isApiAuthenticated && isApiAuthenticated != null) {
      dispatch({ type: 'updateIsAuthenticated', isAuthenticated: isApiAuthenticated });
    }
  }, [isAuthenticated, isApiAuthenticated]);

  useEffect(() => {
    if (canUserCRUD !== capabilitiesCanUserCRUD && capabilitiesCanUserCRUD != null) {
      dispatch({ type: 'updateCanUserCRUD', canUserCRUD: capabilitiesCanUserCRUD });
    }
  }, [canUserCRUD, capabilitiesCanUserCRUD]);

  useEffect(() => {
    if (signalIndexName !== apiSignalIndexName && apiSignalIndexName != null) {
      dispatch({ type: 'updateSignalIndexName', signalIndexName: apiSignalIndexName });
    }
  }, [signalIndexName, apiSignalIndexName]);

  useEffect(() => {
    if (
      isAuthenticated &&
      hasIndexManage &&
      isSignalIndexExists != null &&
      !isSignalIndexExists &&
      createSignalIndex != null
    ) {
      createSignalIndex();
    }
  }, [createSignalIndex, isAuthenticated, isSignalIndexExists, hasIndexManage]);

  return {
    loading,
    isSignalIndexExists,
    isAuthenticated,
    canUserCRUD,
    hasIndexManage,
    hasIndexWrite,
    hasManageApiKey,
    signalIndexName,
  };
};
