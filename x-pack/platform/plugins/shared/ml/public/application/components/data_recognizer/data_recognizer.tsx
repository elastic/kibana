/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactElement } from 'react';
import React, { useEffect, useState } from 'react';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';

import { useMlApi } from '../../contexts/kibana';
import { RecognizedResult } from './recognized_result';

export interface DataRecognizerResults {
  count: number;
  settled: boolean;
  onChange?: () => void;
}

interface Props {
  indexPattern: DataView;
  savedSearch: SavedSearch | null;
  results: DataRecognizerResults;
  className?: string;
}

export const DataRecognizer: FC<Props> = ({ indexPattern, savedSearch, results }) => {
  const mlApi = useMlApi();
  const [recognizedResults, setRecognizedResults] = useState<ReactElement[]>([]);

  useEffect(() => {
    let cancelled = false;

    mlApi
      .recognizeIndex({ indexPatternTitle: indexPattern.title })
      .then((resp) => {
        if (cancelled) {
          return;
        }

        resp.sort((res1, res2) => res1.title.localeCompare(res2.title));

        const elements = resp.map((r) => (
          <RecognizedResult
            key={r.id}
            config={r}
            indexPattern={indexPattern}
            savedSearch={savedSearch}
          />
        ));

        results.count = elements.length;
        results.settled = true;
        results.onChange?.();

        setRecognizedResults(elements);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        // Recognition failed; report as settled with no results.
        results.settled = true;
        results.onChange?.();
      });

    return () => {
      cancelled = true;
    };
  }, [indexPattern, mlApi, results, savedSearch]);

  return <>{recognizedResults}</>;
};
