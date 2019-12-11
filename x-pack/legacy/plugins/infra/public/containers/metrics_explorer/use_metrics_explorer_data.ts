/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { isEqual } from 'lodash';
import { useEffect, useState } from 'react';
import { IIndexPattern } from 'src/plugins/data/public';
import { SourceQuery } from '../../../common/graphql/types';
import {
  MetricsExplorerAggregation,
  MetricsExplorerResponse,
} from '../../../server/routes/metrics_explorer/types';
import { fetch } from '../../utils/fetch';
import { convertKueryToElasticSearchQuery } from '../../utils/kuery';
import { MetricsExplorerOptions, MetricsExplorerTimeOptions } from './use_metrics_explorer_options';

function isSameOptions(current: MetricsExplorerOptions, next: MetricsExplorerOptions) {
  return isEqual(current, next);
}

export function useMetricsExplorerData(
  options: MetricsExplorerOptions,
  source: SourceQuery.Query['source']['configuration'],
  derivedIndexPattern: IIndexPattern,
  timerange: MetricsExplorerTimeOptions,
  afterKey: string | null,
  signal: any
) {
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<MetricsExplorerResponse | null>(null);
  const [lastOptions, setLastOptions] = useState<MetricsExplorerOptions | null>(null);
  const [lastTimerange, setLastTimerange] = useState<MetricsExplorerTimeOptions | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const from = DateMath.parse(timerange.from);
        const to = DateMath.parse(timerange.to, { roundUp: true });
        if (!from || !to) {
          throw new Error('Unalble to parse timerange');
        }
        const response = await fetch.post<MetricsExplorerResponse>(
          '../api/infra/metrics_explorer',
          {
            metrics:
              options.aggregation === MetricsExplorerAggregation.count
                ? [{ aggregation: MetricsExplorerAggregation.count }]
                : options.metrics.map(metric => ({
                    aggregation: metric.aggregation,
                    field: metric.field,
                  })),
            groupBy: options.groupBy,
            afterKey,
            limit: options.limit,
            indexPattern: source.metricAlias,
            filterQuery:
              (options.filterQuery &&
                convertKueryToElasticSearchQuery(options.filterQuery, derivedIndexPattern)) ||
              void 0,
            timerange: {
              ...timerange,
              field: source.fields.timestamp,
              from: from.valueOf(),
              to: to.valueOf(),
            },
          }
        );
        if (response.data) {
          if (
            data &&
            lastOptions &&
            data.pageInfo.afterKey !== response.data.pageInfo.afterKey &&
            isSameOptions(lastOptions, options) &&
            isEqual(timerange, lastTimerange) &&
            afterKey
          ) {
            const { series } = data;
            setData({
              ...response.data,
              series: [...series, ...response.data.series],
            });
          } else {
            setData(response.data);
          }
          setLastOptions(options);
          setLastTimerange(timerange);
          setError(null);
        }
      } catch (e) {
        setError(e);
      }
      setLoading(false);
    })();

    // TODO: fix this dependency list while preserving the semantics
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, source, timerange, signal, afterKey]);
  return { error, loading, data };
}
