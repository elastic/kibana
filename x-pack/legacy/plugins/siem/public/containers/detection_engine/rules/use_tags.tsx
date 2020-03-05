/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useEffect, useState, useRef } from 'react';
import { useStateToaster } from '../../../components/toasters';
import { fetchTags } from './api';
import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import * as i18n from './translations';

export type ReturnTags = [boolean, string[], () => void];

/**
 * Hook for using the list of Tags from the Detection Engine API
 *
 */
export const useTags = (): ReturnTags => {
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();
  const reFetchTags = useRef<() => void>(noop);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchData() {
      setLoading(true);
      try {
        const fetchTagsResult = await fetchTags({
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setTags(fetchTagsResult);
        }
      } catch (error) {
        if (isSubscribed) {
          errorToToaster({ title: i18n.TAG_FETCH_FAILURE, error, dispatchToaster });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    fetchData();
    reFetchTags.current = fetchData;

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, []);

  return [loading, tags, reFetchTags.current];
};
