/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { KueryNode } from '@kbn/es-query';
import { loadRuleHealth } from '../lib/rule_api/health';
import type { RuleHealth } from '../lib/rule_api/health';
import { useKibana } from '../../common/lib/kibana';

export interface UseLoadRuleHealthQueryProps {
  enabled?: boolean;
  ruleTypeIds?: string[];
  consumers?: string[];
  filter?: KueryNode;
  refresh?: Date;
}

export const useLoadRuleHealthQuery = ({
  enabled = true,
  ruleTypeIds,
  consumers,
  filter,
  refresh,
}: UseLoadRuleHealthQueryProps) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.sections.rulesHealth.unableToLoadHealthMessage', {
        defaultMessage: 'Unable to load rule health',
      })
    );
  };

  const { data, refetch, isLoading, isFetching, isError } = useQuery<RuleHealth>({
    queryKey: [
      'loadRuleHealth',
      ruleTypeIds,
      consumers,
      filter,
      { refresh: refresh?.toISOString() },
    ],
    queryFn: () => loadRuleHealth({ http, ruleTypeIds, consumers, filter }),
    onError: onErrorFn,
    enabled,
    keepPreviousData: true,
    cacheTime: 0,
    refetchOnWindowFocus: false,
  });

  return {
    health: data,
    loadRuleHealth: refetch,
    isLoading: isLoading && isFetching,
    isError,
  };
};
