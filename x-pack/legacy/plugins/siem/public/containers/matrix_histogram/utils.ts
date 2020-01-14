/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getOr } from 'lodash/fp';
import { useEffect, useState } from 'react';
import {
  MatrixHistogramDataTypes,
  MatrixHistogramQueryProps,
} from '../../components/matrix_histogram/types';
import { DEFAULT_INDEX_KEY } from '../../../common/constants';
import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import { useUiSetting$ } from '../../lib/kibana';
import { createFilter } from '../helpers';
import { useApolloClient } from '../../utils/apollo_context';
import { inputsModel } from '../../store';
import { GetMatrixHistogramQuery, GetNetworkDnsQuery } from '../../graphql/types';

export const useQuery = <Hit, Aggs, TCache = object>({
  dataKey,
  endDate,
  errorMessage,
  filterQuery,
  isAlertsHistogram = false,
  isAnomaliesHistogram = false,
  isAuthenticationsHistogram = false,
  isEventsType = false,
  isDNSHistogram,
  isPtrIncluded,
  isInspected,
  query,
  stackByField,
  startDate,
  sort,
  pagination,
}: MatrixHistogramQueryProps) => {
  const [defaultIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const [, dispatchToaster] = useStateToaster();
  const [refetch, setRefetch] = useState<inputsModel.Refetch>();
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<MatrixHistogramDataTypes[] | null>(null);
  const [inspect, setInspect] = useState<inputsModel.InspectQuery | null>(null);
  const [totalCount, setTotalCount] = useState(-1);
  const apolloClient = useApolloClient();

  const isDNSQuery = (
    variable: Pick<
      MatrixHistogramQueryProps,
      'isDNSHistogram' | 'isPtrIncluded' | 'sort' | 'pagination'
    >
  ): variable is GetNetworkDnsQuery.Variables => {
    return (
      !!isDNSHistogram &&
      variable.isDNSHistogram !== undefined &&
      variable.isPtrIncluded !== undefined &&
      variable.sort !== undefined &&
      variable.pagination !== undefined
    );
  };
  const basicVariables = {
    filterQuery: createFilter(filterQuery),
    sourceId: 'default',
    timerange: {
      interval: '12h',
      from: startDate!,
      to: endDate!,
    },
    defaultIndex,
    inspect: isInspected,
    stackByField,
  };
  const dnsVariables = {
    ...basicVariables,
    isDNSHistogram,
    isPtrIncluded,
    sort,
    pagination,
  };
  const matrixHistogramVariables: GetMatrixHistogramQuery.Variables = {
    ...basicVariables,
    isAlertsHistogram,
    isAnomaliesHistogram,
    isAuthenticationsHistogram,
    isEventsType,
  };

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    const abortSignal = abortCtrl.signal;

    async function fetchData() {
      if (!apolloClient || (pagination != null && pagination.querySize < 0)) return null;
      setLoading(true);
      return apolloClient
        .query<
          GetMatrixHistogramQuery.Query | GetNetworkDnsQuery.Query,
          GetMatrixHistogramQuery.Variables | GetNetworkDnsQuery.Variables
        >({
          query,
          fetchPolicy: 'cache-first',
          variables: isDNSQuery(dnsVariables) ? dnsVariables : matrixHistogramVariables,
          context: {
            fetchOptions: {
              abortSignal,
            },
          },
        })
        .then(
          result => {
            if (isSubscribed) {
              const isDataKeyAnArray = Array.isArray(dataKey);
              const rootDataKey = isDataKeyAnArray ? dataKey[0] : `${dataKey}`;
              const histogramDataKey = isDataKeyAnArray ? dataKey[1] : `matrixHistogramData`;
              const source = getOr({}, `data.source.${rootDataKey}`, result);
              setData(getOr([], histogramDataKey, source));
              setTotalCount(getOr(-1, 'totalCount', source));
              setInspect(getOr(null, 'inspect', source));
              setLoading(false);
            }
          },
          error => {
            if (isSubscribed) {
              setData(null);
              setTotalCount(-1);
              setInspect(null);
              errorToToaster({ title: errorMessage, error, dispatchToaster });
              setLoading(false);
            }
          }
        );
    }
    setRefetch(() => {
      fetchData();
    });
    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [
    defaultIndex,
    query,
    filterQuery,
    isInspected,
    isDNSHistogram,
    stackByField,
    sort,
    isPtrIncluded,
    pagination,
    startDate,
    endDate,
  ]);

  return { data, loading, inspect, totalCount, refetch };
};
