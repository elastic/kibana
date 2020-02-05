/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HistogramData, SignalsAggregation, SignalsBucket, SignalsGroupBucket } from './types';
import { SignalSearchResponse } from '../../../../containers/detection_engine/signals/types';
import * as i18n from './translations';

export const formatSignalsData = (
  signalsData: SignalSearchResponse<{}, SignalsAggregation> | null
) => {
  const groupBuckets: SignalsGroupBucket[] =
    signalsData?.aggregations?.signalsByGrouping?.buckets ?? [];
  return groupBuckets.reduce<HistogramData[]>((acc, { key: group, signals }) => {
    const signalsBucket: SignalsBucket[] = signals.buckets ?? [];

    return [
      ...acc,
      ...signalsBucket.map(({ key, doc_count }: SignalsBucket) => ({
        x: key,
        y: doc_count,
        g: group,
      })),
    ];
  }, []);
};

export const getSignalsHistogramQuery = (
  stackByField: string,
  from: number,
  to: number,
  additionalFilters: Array<{
    bool: { filter: unknown[]; should: unknown[]; must_not: unknown[]; must: unknown[] };
  }>
) => ({
  aggs: {
    signalsByGrouping: {
      terms: {
        field: stackByField,
        missing: stackByField.endsWith('.ip') ? '0.0.0.0' : i18n.ALL_OTHERS,
        order: {
          _count: 'desc',
        },
        size: 10,
      },
      aggs: {
        signals: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: `${Math.floor((to - from) / 32)}ms`,
            min_doc_count: 0,
            extended_bounds: {
              min: from,
              max: to,
            },
          },
        },
      },
    },
  },
  query: {
    bool: {
      filter: [
        ...additionalFilters,
        {
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
            },
          },
        },
      ],
    },
  },
});

/**
 * Returns `true` when the signals histogram initial loading spinner should be shown
 *
 * @param isInitialLoading The loading spinner will only be displayed if this value is `true`, because after initial load, a different, non-spinner loading indicator is displayed
 * @param isLoadingSignals When `true`, IO is being performed to request signals (for rendering in the histogram)
 */
export const showInitialLoadingSpinner = ({
  isInitialLoading,
  isLoadingSignals,
}: {
  isInitialLoading: boolean;
  isLoadingSignals: boolean;
}): boolean => isInitialLoading && isLoadingSignals;
