/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useEffect, useState } from 'react';

import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';
import { FetchRulesResponse, PaginationOptions } from './types';
import { useStateToaster } from '../../../components/toasters';
import { fetchRules } from './api';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import * as i18n from './translations';

type Return = [
  boolean,
  FetchRulesResponse,
  Dispatch<SetStateAction<FetchRulesResponse>>,
  Dispatch<SetStateAction<PaginationOptions>>
];

/**
 * Hook for using the list of Rules from the Detection Engine API
 *
 * @param refetchToggle toggle for refetching data
 */
export const useRules = (refetchToggle: boolean): Return => {
  const [rules, setRules] = useState<FetchRulesResponse>({
    page: 1,
    perPage: 20,
    total: 0,
    data: [],
  });
  const [loading, setLoading] = useState(true);
  const [paginationOptions, setPaginationOptions] = useState<PaginationOptions>({
    page: 1,
    perPage: 20,
    sortField: 'name',
  });
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchData() {
      try {
        const fetchRulesResult = await fetchRules({ paginationOptions, kbnVersion });

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
  }, [refetchToggle, paginationOptions]);

  console.log('Updated Rules:', rules);
  return [loading, rules, setRules, setPaginationOptions];
};
