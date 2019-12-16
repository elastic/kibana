/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import { useLibs, Pagination } from '../../../../hooks';
import { ReturnTypeList, ReturnTypeGet } from '../../../../../common/return_types';
import { EnrollmentApiKey } from '../../../../../common/types/domain_data';
import { Policy } from '../../../../../common/types/domain_data';

export function useEnrollmentApiKeys(pagination: Pagination) {
  const { enrollmentApiKeys } = useLibs();
  const [state, setState] = useState<{
    data: ReturnTypeList<EnrollmentApiKey> | null;
    isLoading: boolean;
  }>({
    isLoading: true,
    data: null,
  });
  async function fetchApiKeys() {
    try {
      const data = await enrollmentApiKeys.listKeys(pagination);
      setState({
        isLoading: false,
        data,
      });
    } catch (error) {
      setState({
        isLoading: false,
        data: null,
      });
    }
  }
  useEffect(() => {
    fetchApiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    refresh: () => fetchApiKeys(),
  };
}

export function usePolicies() {
  const { policies } = useLibs();
  const [state, setState] = useState<{
    data: Policy[];
    isLoading: boolean;
  }>({
    isLoading: true,
    data: [],
  });

  async function fetchPolicies() {
    try {
      const result = await policies.getAll(1, 10000);
      setState({
        data: result.list,
        isLoading: false,
      });
    } catch (err) {
      setState({
        data: [],
        isLoading: false,
      });
    }
  }

  useEffect(() => {
    fetchPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
  };
}

export function useEnrollmentApiKey(apiKeyId: string | null) {
  const { enrollmentApiKeys } = useLibs();
  const [state, setState] = useState<{
    data: ReturnTypeGet<EnrollmentApiKey> | null;
    isLoading: boolean;
  }>({
    isLoading: true,
    data: null,
  });
  useEffect(() => {
    async function fetchApiKey() {
      if (!apiKeyId) {
        setState({
          isLoading: false,
          data: null,
        });
        return;
      }
      try {
        const data = await enrollmentApiKeys.get(apiKeyId);
        setState({
          isLoading: false,
          data,
        });
      } catch (error) {
        setState({
          isLoading: false,
          data: null,
        });
      }
    }
    fetchApiKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeyId]);

  return {
    ...state,
  };
}
