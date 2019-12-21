/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HistogramData, SignalsAggregation, SignalsBucket, SignalsGroupBucket } from '../types';
import { SignalSearchResponse } from '../../../../../containers/detection_engine/signals/types';
import * as i18n from '../translations';

export const formatSignalsData = (
  signalsData: SignalSearchResponse<{}, SignalsAggregation> | null
) => {
  const groupBuckets: SignalsGroupBucket[] =
    signalsData?.aggregations?.signalsByGrouping?.buckets ?? [];
  let result: HistogramData[] = [];
  groupBuckets.forEach(({ key: group, signals }) => {
    const signalsBucket: SignalsBucket[] = signals?.buckets ?? [];

    result = [
      ...result,
      ...signalsBucket.map(({ key, doc_count }: SignalsBucket) => ({
        x: key,
        y: doc_count,
        g: group,
      })),
    ];
  });

  return result;
};

export const getSignalsHistogramQuery = (stackByField: string, from: number, to: number) => ({
  aggs: {
    signalsByGrouping: {
      terms: {
        field: stackByField,
        missing: i18n.ALL_OTHERS,
        order: {
          _count: 'desc',
        },
        size: 10,
      },
      aggs: {
        signals: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '30s',
          },
        },
      },
    },
  },
  query: {
    bool: {
      filter: [
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
