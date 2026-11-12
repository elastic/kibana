/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { loadGlobalExecutionTrends } from '../lib/rule_api/load_global_execution_trends';
import type { ExecutionTrends } from '../lib/rule_api/load_global_execution_trends';
import { useKibana } from '../../common/lib/kibana';

export interface UseLoadGlobalExecutionTrendsQueryProps {
  enabled?: boolean;
  dateStart: string;
  dateEnd?: string;
  ruleTypeIds?: string[];
  namespaces?: Array<string | undefined>;
  refresh?: Date;
}

export const useLoadGlobalExecutionTrendsQuery = ({
  enabled = true,
  dateStart,
  dateEnd,
  ruleTypeIds,
  namespaces,
  refresh,
}: UseLoadGlobalExecutionTrendsQueryProps) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.sections.rulesHealth.unableToLoadTrendsMessage', {
        defaultMessage: 'Unable to load rule execution trends',
      })
    );
  };

  const { data, refetch, isLoading, isFetching, isError } = useQuery<ExecutionTrends>({
    queryKey: [
      'loadGlobalExecutionTrends',
      dateStart,
      dateEnd,
      ruleTypeIds,
      namespaces,
      { refresh: refresh?.toISOString() },
    ],
    queryFn: () => loadGlobalExecutionTrends({ http, dateStart, dateEnd, ruleTypeIds, namespaces }),
    onError: onErrorFn,
    enabled,
    keepPreviousData: true,
    cacheTime: 0,
    refetchOnWindowFocus: false,
  });

  return {
    trends: data,
    loadTrends: refetch,
    isLoading: isLoading && isFetching,
    isError,
  };
};
