/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import datemath from '@kbn/datemath';
import type { IExecutionLogResult } from '@kbn/alerting-plugin/common';
import type { ResponseOpsQueryMeta } from '@kbn/response-ops-react-query/types';
import { useKibana } from '../../common/lib/kibana';
import type {
  LoadExecutionLogAggregationsProps,
  LoadGlobalExecutionLogAggregationsProps,
} from '../lib/rule_api/load_execution_log_aggregations';
import {
  loadExecutionLogAggregations,
  loadGlobalExecutionLogAggregations,
} from '../lib/rule_api/load_execution_log_aggregations';

const getParsedDate = (date: string) => {
  if (date.includes('now')) {
    return datemath.parse(date)?.format() || date;
  }
  return date;
};

interface CommonProps {
  getErrorToast?: ResponseOpsQueryMeta['getErrorToast'];
}

type LoadExecutionLogProps = LoadExecutionLogAggregationsProps & CommonProps;
type LoadGlobalExecutionLogProps = LoadGlobalExecutionLogAggregationsProps & CommonProps;

export type UseLoadRuleEventLogsProps = LoadExecutionLogProps | LoadGlobalExecutionLogProps;

const isGlobal = (props: UseLoadRuleEventLogsProps): props is LoadGlobalExecutionLogProps => {
  return (props as LoadExecutionLogAggregationsProps).id === '*';
};

export function useLoadRuleEventLogs(props: UseLoadRuleEventLogsProps) {
  const { http } = useKibana().services;
  const queryFn = useCallback(() => {
    if (isGlobal(props)) {
      return loadGlobalExecutionLogAggregations({
        http,
        ...props,
        dateStart: getParsedDate(props.dateStart),
        ...(props.dateEnd ? { dateEnd: getParsedDate(props.dateEnd) } : {}),
      });
    }
    return loadExecutionLogAggregations({
      http,
      ...props,
      dateStart: getParsedDate(props.dateStart),
      ...(props.dateEnd ? { dateEnd: getParsedDate(props.dateEnd) } : {}),
    });
  }, [props, http]);

  const { data, error, isLoading, isFetching, refetch } = useQuery<
    IExecutionLogResult,
    { body?: { statusCode: number } } // TODO is there a type for this error shape?
  >({
    queryKey: ['loadRuleEventLog', props],
    queryFn,
    retry: 0,
    refetchOnWindowFocus: false,
    meta: {
      getErrorToast: props.getErrorToast,
    } satisfies ResponseOpsQueryMeta,
  });
  const hasExceedLogs = useMemo(() => error && error.body?.statusCode === 413, [error]);
  return useMemo(
    () => ({
      data,
      hasExceedLogs,
      isLoading: isLoading || isFetching,
      loadEventLogs: refetch,
    }),
    [data, hasExceedLogs, isFetching, isLoading, refetch]
  );
}
