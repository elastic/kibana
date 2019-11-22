/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, Dispatch } from 'react';

import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';
import { useStateToaster } from '../../../components/toasters';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';

import { addRule as persistRule } from './api';
import * as i18n from './translations';
import { NewRule } from './types';

interface PersistRuleReturn {
  isLoading: boolean;
  isSaved: boolean;
}

type Return = [PersistRuleReturn, Dispatch<NewRule | null>];

export const usePersistRule = (): Return => {
  const [rule, setRule] = useState<NewRule | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setIsSaved(false);
    async function saveRule() {
      if (rule != null) {
        try {
          setIsLoading(true);
          await persistRule({ rule, kbnVersion, signal: abortCtrl.signal });

          if (isSubscribed) {
            setIsSaved(true);
          }
        } catch (error) {
          if (isSubscribed) {
            errorToToaster({ title: i18n.RULE_ADD_FAILURE, error, dispatchToaster });
          }
        }
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    saveRule();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [rule]);

  return [{ isLoading, isSaved }, setRule];
};
