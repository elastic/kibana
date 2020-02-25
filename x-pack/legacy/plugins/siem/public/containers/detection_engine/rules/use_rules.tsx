/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useRef } from 'react';

import { FetchRulesResponse, FilterOptions, PaginationOptions } from './types';
import { useStateToaster } from '../../../components/toasters';
import { fetchRules } from './api';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import * as i18n from './translations';

type Func = () => void;
export type ReturnRules = [boolean, FetchRulesResponse, Func | null];

/**
 * Hook for using the list of Rules from the Detection Engine API
 *
 * @param pagination desired pagination options (e.g. page/perPage)
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 */
export const useRules = (
  pagination: PaginationOptions,
  filterOptions: FilterOptions
): ReturnRules => {
  const [rules, setRules] = useState<FetchRulesResponse>({
    page: 1,
    perPage: 20,
    total: 0,
    data: [],
  });
  const reFetchRules = useRef<Func | null>(null);
  const [loading, setLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchData(forceReload: boolean = false) {
      try {
        setLoading(true);
        const fetchRulesResult = await fetchRules({
          filterOptions,
          pagination,
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
    reFetchRules.current = fetchData.bind(null, true);
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [
    pagination.page,
    pagination.perPage,
    filterOptions.filter,
    filterOptions.sortField,
    filterOptions.sortOrder,
    filterOptions.tags?.sort().join(),
    filterOptions.showCustomRules,
    filterOptions.showElasticRules,
  ]);

  return [loading, rules, reFetchRules.current];
};
