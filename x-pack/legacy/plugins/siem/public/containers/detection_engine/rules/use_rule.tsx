/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';
import { useStateToaster } from '../../../components/toasters';
import { fetchRuleById } from './api';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import * as i18n from './translations';
import { Rule } from './types';

type Return = [boolean, Rule | null];

/**
 * Hook for using to get a Rule from the Detection Engine API
 *
 * @param id desired Rule ID's (not rule_id)
 *
 */
export const useRule = (id: string | undefined): Return => {
  const [rule, setRule] = useState<Rule | null>(null);
  const [loading, setLoading] = useState(true);
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchData(idToFetch: string) {
      try {
        setLoading(true);
        const ruleResponse = await fetchRuleById({
          id: idToFetch,
          kbnVersion,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setRule(ruleResponse);
        }
      } catch (error) {
        if (isSubscribed) {
          setRule(null);
          errorToToaster({ title: i18n.RULE_FETCH_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }
    if (id != null) {
      fetchData(id);
    }
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [id]);

  return [loading, rule];
};
