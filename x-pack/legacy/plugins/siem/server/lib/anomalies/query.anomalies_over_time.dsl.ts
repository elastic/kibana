/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses, calculateTimeseriesInterval } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';
import { useKibanaUiSetting } from '../../../public/lib/settings/use_kibana_ui_setting';
import { DEFAULT_ANOMALY_SCORE } from '../../../common/constants';

export const buildAnomaliesOverTimeQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
}: RequestBasicOptions) => {
  const [anomalyScore] = useKibanaUiSetting(DEFAULT_ANOMALY_SCORE);

  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      match_phrase: {
        result_type: 'record',
      },
    },
    {
      range: {
        record_score: {
          gte: anomalyScore,
        },
      },
    },
    {
      range: {
        timestamp: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const getHistogramAggregation = () => {
    const interval = calculateTimeseriesInterval(from, to);
    const histogramTimestampField = 'timestamp';
    const dateHistogram = {
      date_histogram: {
        field: histogramTimestampField,
        fixed_interval: `${interval}s`,
      },
    };
    const autoDateHistogram = {
      auto_date_histogram: {
        field: histogramTimestampField,
        buckets: 36,
      },
    };
    return {
      anomalyActionGroup: {
        terms: {
          field: 'job_id',
          order: {
            _count: 'desc',
          },
          size: 10,
        },
        aggs: {
          anomalies: interval ? dateHistogram : autoDateHistogram,
        },
      },
    };
  };

  const dslQuery = {
    index: defaultIndex,
    allowNoIndices: true,
    ignoreUnavailable: true,
    body: {
      aggs: getHistogramAggregation(),
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};
