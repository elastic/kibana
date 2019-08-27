/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { getIndexPatterns } from '../api';
import { useStateToaster } from '../../toasters';
import { errorToToaster } from '../../ml/api/error_to_toaster';
import { useKibanaUiSetting } from '../../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';

import * as i18n from './translations';

type Return = [boolean, string[]];

export const useIndexPatterns = (refreshToggle = false): Return => {
  const [indexPatterns, setIndexPatterns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

  const fetchFunc = async () => {
    try {
      const data = await getIndexPatterns({
        'kbn-version': kbnVersion,
      });

      setIndexPatterns(data);
      setIsLoading(false);
    } catch (error) {
      errorToToaster({ title: i18n.INDEX_PATTERN_FETCH_FAILURE, error, dispatchToaster });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchFunc();
  }, [refreshToggle]);

  return [isLoading, indexPatterns];
};
