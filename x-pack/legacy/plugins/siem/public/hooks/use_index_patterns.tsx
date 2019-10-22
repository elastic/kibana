/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { useStateToaster } from '../components/toasters';
import { errorToToaster } from '../components/ml/api/error_to_toaster';

import * as i18n from './translations';
import { IndexPatternSavedObject } from '../components/ml_popover/types';
import { getIndexPatterns } from './api/api';

type Return = [boolean, IndexPatternSavedObject[]];

export const useIndexPatterns = (refreshToggle = false): Return => {
  const [indexPatterns, setIndexPatterns] = useState<IndexPatternSavedObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setIsLoading(true);

    async function fetchIndexPatterns() {
      try {
        const data = await getIndexPatterns(abortCtrl.signal);

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
      abortCtrl.abort();
    };
  }, [refreshToggle]);

  return [isLoading, indexPatterns];
};
