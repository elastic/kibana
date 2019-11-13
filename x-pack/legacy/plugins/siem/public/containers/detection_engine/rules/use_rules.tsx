/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';
import { Rule } from './types';
import { useStateToaster } from '../../../components/toasters';
import { fetchRules } from './api';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import * as i18n from './translations';

type Return = [boolean, Rule[]];

/**
 * Hook for using the list of Rules from the Detection Engine API
 *
 * @param refetchData
 */
export const useRules = (refetchData: boolean): Return => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchData() {
      try {
        const fetchRulesResult = await fetchRules({ kbnVersion });

        if (isSubscribed) {
          setRules(fetchRulesResult.data);
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
  }, [refetchData]);

  return [loading, rules];
};
