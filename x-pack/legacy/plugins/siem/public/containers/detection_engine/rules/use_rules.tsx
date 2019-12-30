/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { useUiSetting$ } from '../../../lib/kibana';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';
import { FetchRulesResponse, FilterOptions, PaginationOptions } from './types';
import { useStateToaster } from '../../../components/toasters';
import { fetchRules } from './api';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import * as i18n from './translations';

type Return = [boolean, FetchRulesResponse];

/**
 * Hook for using the list of Rules from the Detection Engine API
 *
 * @param pagination desired pagination options (e.g. page/perPage)
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 * @param refetchToggle toggle for refetching data
 */
export const useRules = (
  pagination: PaginationOptions,
  filterOptions: FilterOptions,
  refetchToggle: boolean
): Return => {
  const [rules, setRules] = useState<FetchRulesResponse>({
    page: 1,
    perPage: 20,
    total: 0,
    data: [],
  });
  const [loading, setLoading] = useState(true);
  const [kbnVersion] = useUiSetting$<string>(DEFAULT_KBN_VERSION);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchData() {
      try {
        const fetchRulesResult = await fetchRules({
          filterOptions,
          pagination,
          kbnVersion,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setRules(fetchRulesResult);
        }
      } catch (error) {
        if (isSubscribed) {
          errorToToaster({ title: i18n.RULE_FETCH_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [
    refetchToggle,
    pagination.page,
    pagination.perPage,
    filterOptions.filter,
    filterOptions.sortField,
    filterOptions.sortOrder,
  ]);

  return [loading, rules];
};
