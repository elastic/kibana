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
import { IndexPatternSavedObject } from '../types';

type Return = [boolean, IndexPatternSavedObject[]];

// TODO: Used by more than just ML now -- refactor to shared component https://github.com/elastic/siem-team/issues/448

export const useIndexPatterns = (refreshToggle = false): Return => {
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternSavedObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);

    async function fetchIndexPatterns() {
      try {
        const data = await getIndexPatterns({
          'kbn-version': kbnVersion,
        });

        if (isSubscribed) {
          setIndexPatterns(data);
          setIsLoading(false);
        }
      } catch (error) {
        if (isSubscribed) {
          errorToToaster({ title: i18n.INDEX_PATTERN_FETCH_FAILURE, error, dispatchToaster });
          setIsLoading(false);
        }
      }
    }

    fetchIndexPatterns();
    return () => {
      isSubscribed = false;
    };
  }, [refreshToggle]);

  return [isLoading, indexPatterns];
};
