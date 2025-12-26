/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import { getIndexDocCount } from '../sections/home/index_list/index_table/util/get_index_doc_count';

interface UseIndexDocCountArgs {
  http?: HttpSetup;
  indexName?: string;
}

export const useIndexDocCount = ({ http, indexName }: UseIndexDocCountArgs) => {
  const [count, setCount] = useState<number | undefined>(undefined);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setCount(undefined);
    setIsError(false);

    if (!http || !indexName) return;

    const abortController = new AbortController();

    getIndexDocCount(http, indexName)
      .then((nextCount) => {
        if (!abortController.signal.aborted) setCount(nextCount);
      })
      .catch(() => {
        if (!abortController.signal.aborted) setIsError(true);
      });

    return () => {
      abortController.abort();
    };
  }, [http, indexName]);

  return {
    count,
    isLoading: Boolean(http) && indexName !== undefined && count === undefined && !isError,
    isError,
  };
};
