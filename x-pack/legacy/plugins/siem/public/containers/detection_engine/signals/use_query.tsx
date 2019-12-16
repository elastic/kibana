/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../../components/toasters';

import { fetchQuerySignals } from './api';
import * as i18n from './translations';
import { SignalSearchResponse } from './types';

type Return<Hit, Aggs> = [boolean, SignalSearchResponse<Hit, Aggs> | null];

/**
 * Hook for using to get a Rule from the Detection Engine API
 *
 * @param id desired Rule ID's (not rule_id)
 *
 */
export const useQuerySignals = <Hit, Aggs>(query: string): Return<Hit, Aggs> => {
  const [signals, setSignals] = useState<SignalSearchResponse<Hit, Aggs> | null>(null);
  const [loading, setLoading] = useState(true);
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchData() {
      try {
        const signalResponse = await fetchQuerySignals<Hit, Aggs>({
          query,
          kbnVersion,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setSignals(signalResponse);
        }
      } catch (error) {
        if (isSubscribed) {
          setSignals(null);
          errorToToaster({ title: i18n.SIGNAL_FETCH_FAILURE, error, dispatchToaster });
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
  }, [query]);

  return [loading, signals];
};
