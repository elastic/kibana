/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { useMemo } from 'react';
import { loadRuleTypes } from '../lib/rule_api/rule_types';
import { useKibana } from '../../common/lib/kibana';
import { RuleType, RuleTypeIndex } from '../../types';

interface UseLoadRuleTypesQueryProps {
  filteredRuleTypes: string[];
  enabled?: boolean;
}

const getFilteredIndex = (data: Array<RuleType<string, string>>, filteredRuleTypes: string[]) => {
  const index: RuleTypeIndex = new Map();
  for (const ruleType of data) {
    index.set(ruleType.id, ruleType);
  }
  let filteredIndex = index;
  if (filteredRuleTypes?.length) {
    filteredIndex = new Map(
      [...index].filter(([k, v]) => {
        return filteredRuleTypes.includes(v.id);
      })
    );
  }
  return filteredIndex;
};

export const useLoadRuleTypesQuery = ({
  filteredRuleTypes,
  enabled = true,
}: UseLoadRuleTypesQueryProps) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    return loadRuleTypes({ http });
  };

  const onErrorFn = () => {
    toasts.addDanger(
      i18n.translate('xpack.triggersActionsUI.sections.rulesList.unableToLoadRuleTypesMessage', {
        defaultMessage: 'Unable to load rule types',
      })
    );
  };

  const { data, isSuccess, isFetching, isInitialLoading, isLoading, error } = useQuery({
    queryKey: ['loadRuleTypes'],
    queryFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    // Leveraging TanStack Query's caching system to avoid duplicated requests as
    // other state-sharing solutions turned out to be overly complex and less readable
    staleTime: 60 * 1000,
    enabled,
  });

  const filteredIndex = useMemo(
    () => (data ? getFilteredIndex(data, filteredRuleTypes) : new Map<string, RuleType>()),
    [data, filteredRuleTypes]
  );

  const hasAnyAuthorizedRuleType = filteredIndex.size > 0;
  const authorizedRuleTypes = useMemo(() => [...filteredIndex.values()], [filteredIndex]);
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTING_FEATURE_ID]?.all
  );
  const authorizedToReadAnyRules =
    authorizedToCreateAnyRules ||
    authorizedRuleTypes.some((ruleType) => ruleType.authorizedConsumers[ALERTING_FEATURE_ID]?.read);

  return {
    ruleTypesState: {
      initialLoad: isLoading || isInitialLoading,
      isLoading: isLoading || isFetching,
      data: filteredIndex,
      error,
    },
    hasAnyAuthorizedRuleType,
    authorizedRuleTypes,
    authorizedToReadAnyRules,
    authorizedToCreateAnyRules,
    isSuccess,
  };
};
