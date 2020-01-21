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
  createPrePackagedRules: Func | null;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  refetchPrePackagedRulesStatus: Func | null;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
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
  const refetchPrePackagedRules = useRef<Func | null>(null);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchPrePackagedRules = async () => {
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
    };

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
            let iterationTryOfFetchingPrePackaagedCount = 0;
            let timeoutId = -1;
            const stopTimeOut = () => {
              if (timeoutId !== -1) {
                window.clearTimeout(timeoutId);
              }
            };
            const reFetch = () =>
              window.setTimeout(async () => {
                iterationTryOfFetchingPrePackaagedCount =
                  iterationTryOfFetchingPrePackaagedCount + 1;
                const prePackagedRuleStatusResponse = await getPrePackagedRulesStatus({
                  signal: abortCtrl.signal,
                });
                if (
                  isSubscribed &&
                  ((prePackagedRuleStatusResponse.rules_not_installed === 0 &&
                    prePackagedRuleStatusResponse.rules_not_updated === 0) ||
                    iterationTryOfFetchingPrePackaagedCount > 100)
                ) {
                  setLoadingCreatePrePackagedRules(false);
                  setRulesInstalled(prePackagedRuleStatusResponse.rules_installed);
                  setRulesNotInstalled(prePackagedRuleStatusResponse.rules_not_installed);
                  setRulesNotUpdated(prePackagedRuleStatusResponse.rules_not_updated);
                  displaySuccessToast(i18n.RULE_PREPACKAGED_SUCCESS, dispatchToaster);
                  stopTimeOut();
                } else {
                  timeoutId = reFetch();
                }
              }, 300);
            timeoutId = reFetch();
          }
        }
      } catch (error) {
        if (isSubscribed) {
          setLoadingCreatePrePackagedRules(false);
          errorToToaster({ title: i18n.RULE_PREPACKAGED_FAILURE, error, dispatchToaster });
        }
      }
    };

    fetchPrePackagedRules();
    createPrePackagedRules.current = createElasticRules;
    refetchPrePackagedRules.current = fetchPrePackagedRules;
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [canUserCRUD, hasIndexManage, hasManageApiKey, isAuthenticated, isSignalIndexExists]);

  return {
    loading,
    loadingCreatePrePackagedRules,
    refetchPrePackagedRulesStatus: refetchPrePackagedRules.current,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
    createPrePackagedRules: createPrePackagedRules.current,
  };
};
