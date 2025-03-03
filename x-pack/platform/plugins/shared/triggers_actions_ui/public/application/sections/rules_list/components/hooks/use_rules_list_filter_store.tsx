/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory } from 'react-router-dom';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { isEmpty } from 'lodash';
import { RuleStatus } from '../../../../../common';
import { RulesListFilters, RulesListProps, UpdateFiltersProps } from '../../../../../types';

type FilterStoreProps = Pick<
  RulesListProps,
  | 'lastResponseFilter'
  | 'lastRunOutcomeFilter'
  | 'rulesListKey'
  | 'ruleParamFilter'
  | 'statusFilter'
  | 'searchFilter'
  | 'typeFilter'
>;
const RULES_LIST_FILTERS_KEY = 'triggersActionsUi_rulesList';

interface FilterParameters {
  actionTypes?: string[];
  lastResponse?: string[];
  params?: Record<string, string | number | object>;
  search?: string;
  status?: RuleStatus[];
  tags?: string[];
  type?: string[];
}

export const convertRulesListFiltersToFilterAttributes = (
  rulesListFilter: RulesListFilters
): FilterParameters => {
  return {
    actionTypes: rulesListFilter.actionTypes,
    lastResponse: rulesListFilter.ruleLastRunOutcomes,
    params: rulesListFilter.ruleParams,
    search: rulesListFilter.searchText,
    status: rulesListFilter.ruleStatuses,
    tags: rulesListFilter.tags,
    type: rulesListFilter.types,
  };
};

export const useRulesListFilterStore = ({
  lastResponseFilter,
  lastRunOutcomeFilter,
  rulesListKey = RULES_LIST_FILTERS_KEY,
  ruleParamFilter,
  statusFilter,
  searchFilter,
  typeFilter,
}: FilterStoreProps): {
  filters: RulesListFilters;
  setFiltersStore: (params: UpdateFiltersProps) => void;
  numberOfFiltersStore: number;
  resetFiltersStore: () => void;
} => {
  const history = useHistory();
  const urlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: false,
    useHashQuery: false,
  });

  const [rulesListFilterLocal, setRulesListFilterLocal] = useLocalStorage<FilterParameters>(
    `${RULES_LIST_FILTERS_KEY}_filters`,
    {}
  );
  const hasFilterFromLocalStorage = useMemo(
    () =>
      rulesListFilterLocal
        ? !Object.values(rulesListFilterLocal).every((filters) => isEmpty(filters))
        : false,
    [rulesListFilterLocal]
  );

  const rulesListFilterUrl = useMemo(
    () => urlStateStorage.get<FilterParameters>('_a') ?? {},
    [urlStateStorage]
  );

  const hasFilterFromUrl = useMemo(
    () =>
      rulesListFilterUrl
        ? !Object.values(rulesListFilterUrl).every((filters) => isEmpty(filters))
        : false,
    [rulesListFilterUrl]
  );

  const filtersStore = useMemo(
    () =>
      hasFilterFromUrl ? rulesListFilterUrl : hasFilterFromLocalStorage ? rulesListFilterLocal : {},
    [hasFilterFromLocalStorage, hasFilterFromUrl, rulesListFilterLocal, rulesListFilterUrl]
  );
  const [filters, setFilters] = useState<RulesListFilters>({
    actionTypes: filtersStore?.actionTypes ?? [],
    ruleExecutionStatuses: lastResponseFilter ?? [],
    ruleLastRunOutcomes: filtersStore?.lastResponse ?? lastRunOutcomeFilter ?? [],
    ruleParams: filtersStore?.params ?? ruleParamFilter ?? {},
    ruleStatuses: filtersStore?.status ?? statusFilter ?? [],
    searchText: filtersStore?.search ?? searchFilter ?? '',
    tags: filtersStore?.tags ?? [],
    types: filtersStore?.type ?? typeFilter ?? [],
    kueryNode: undefined,
  });

  const updateUrlFilters = useCallback(
    (updatedParams: RulesListFilters) => {
      urlStateStorage.set('_a', convertRulesListFiltersToFilterAttributes(updatedParams));
    },
    [urlStateStorage]
  );

  const updateLocalFilters = useCallback(
    (updatedParams: RulesListFilters) => {
      setRulesListFilterLocal(convertRulesListFiltersToFilterAttributes(updatedParams));
    },
    [setRulesListFilterLocal]
  );

  const setFiltersStore = useCallback(
    (updateFiltersProps: UpdateFiltersProps) => {
      const { filter, value } = updateFiltersProps;
      setFilters((prev) => {
        const newFilters = {
          ...prev,
          [filter]: value,
        };
        updateUrlFilters(newFilters);
        updateLocalFilters(newFilters);
        return newFilters;
      });
    },
    [updateLocalFilters, updateUrlFilters]
  );

  const resetFiltersStore = useCallback(() => {
    const resetFilter = {
      actionTypes: [],
      ruleExecutionStatuses: [],
      ruleLastRunOutcomes: [],
      ruleParams: {},
      ruleStatuses: [],
      searchText: '',
      tags: [],
      types: [],
      kueryNode: undefined,
    };
    setFilters(resetFilter);
    updateUrlFilters(resetFilter);
    updateLocalFilters(resetFilter);
  }, [updateLocalFilters, updateUrlFilters]);

  useEffect(() => {
    if (hasFilterFromUrl || hasFilterFromLocalStorage) {
      setFilters({
        actionTypes: filtersStore?.actionTypes ?? [],
        ruleExecutionStatuses: lastResponseFilter ?? [],
        ruleLastRunOutcomes: filtersStore?.lastResponse ?? lastRunOutcomeFilter ?? [],
        ruleParams: filtersStore?.params ?? ruleParamFilter ?? {},
        ruleStatuses: filtersStore?.status ?? statusFilter ?? [],
        searchText: filtersStore?.search ?? searchFilter ?? '',
        tags: filtersStore?.tags ?? [],
        types: filtersStore?.type ?? typeFilter ?? [],
        kueryNode: undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({
      filters,
      setFiltersStore,
      numberOfFiltersStore: Object.values(filters).filter((filter) => !isEmpty(filter)).length,
      resetFiltersStore,
    }),
    [filters, resetFiltersStore, setFiltersStore]
  );
};
