/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useRef } from 'react';

import { useStateToaster, displaySuccessToast } from '../../../components/toasters';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import { getPrePackagedRulesStatus, createPrepackagedRules } from './api';
import * as i18n from './translations';

type Func = () => void;

interface Return {
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
  createPrePackagedRules: Func | null;
}

interface UsePrePackagedRuleProps {
  canUserCRUD: boolean | null;
  hasIndexManage: boolean | null;
  hasManageApiKey: boolean | null;
  isAuthenticated: boolean | null;
  isSignalIndexExists: boolean | null;
}

/**
 * Hook for using to get status about pre-packaged Rules from the Detection Engine API
 *
 * @param hasIndexManage boolean
 * @param hasManageApiKey boolean
 * @param isAuthenticated boolean
 * @param isSignalIndexExists boolean
 *
 */
export const usePrePackagedRules = ({
  canUserCRUD,
  hasIndexManage,
  hasManageApiKey,
  isAuthenticated,
  isSignalIndexExists,
}: UsePrePackagedRuleProps): Return => {
  const [rulesInstalled, setRulesInstalled] = useState<number | null>(null);
  const [rulesNotInstalled, setRulesNotInstalled] = useState<number | null>(null);
  const [rulesNotUpdated, setRulesNotUpdated] = useState<number | null>(null);
  const [loadingCreatePrePackagedRules, setLoadingCreatePrePackagedRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const createPrePackagedRules = useRef<Func | null>(null);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        const prePackagedRuleStatusResponse = await getPrePackagedRulesStatus({
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setRulesInstalled(prePackagedRuleStatusResponse.rules_installed);
          setRulesNotInstalled(prePackagedRuleStatusResponse.rules_not_installed);
          setRulesNotUpdated(prePackagedRuleStatusResponse.rules_not_updated);
        }
      } catch (error) {
        if (isSubscribed) {
          setRulesInstalled(null);
          setRulesNotInstalled(null);
          setRulesNotUpdated(null);
          errorToToaster({ title: i18n.RULE_FETCH_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    const createElasticRules = async () => {
      try {
        if (
          canUserCRUD &&
          hasIndexManage &&
          hasManageApiKey &&
          isAuthenticated &&
          isSignalIndexExists
        ) {
          setLoadingCreatePrePackagedRules(true);
          await createPrepackagedRules({
            signal: abortCtrl.signal,
          });

          if (isSubscribed) {
            fetchData();
            displaySuccessToast(i18n.RULE_PREPACKAGED_SUCCESS, dispatchToaster);
          }
        }
      } catch (error) {
        if (isSubscribed) {
          errorToToaster({ title: i18n.RULE_PREPACKAGED_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoadingCreatePrePackagedRules(false);
      }
    };

    fetchData();
    createPrePackagedRules.current = createElasticRules;
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [canUserCRUD, hasIndexManage, hasManageApiKey, isAuthenticated, isSignalIndexExists]);

  return {
    loading,
    loadingCreatePrePackagedRules,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
    createPrePackagedRules: createPrePackagedRules.current,
  };
};
