/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { Policy } from '../../../../common/types/domain_data';
import { useLibs } from '../../../hooks';

export function useGetPolicy(id: string) {
  const { policies } = useLibs();
  const [state, setState] = useState<{
    isLoading: boolean;
    policy: Policy | null;
    error: Error | null;
  }>({
    isLoading: false,
    policy: null,
    error: null,
  });

  const fetchPolicy = async (refresh = false) => {
    setState({
      ...state,
      error: null,
      isLoading: !refresh,
    });
    try {
      const policy = await policies.get(id);
      setState({
        isLoading: false,
        policy,
        error: null,
      });
    } catch (error) {
      setState({
        isLoading: false,
        policy: null,
        error,
      });
    }
  };
  useEffect(() => {
    fetchPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return {
    ...state,
    refreshPolicy: () => fetchPolicy(true),
  };
}

export const PolicyRefreshContext = React.createContext({ refresh: () => {} });

export function usePolicyRefresh() {
  return React.useContext(PolicyRefreshContext).refresh;
}
