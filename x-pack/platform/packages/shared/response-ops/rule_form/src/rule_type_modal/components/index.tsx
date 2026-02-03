/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countBy } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { RuleTypeModel } from '@kbn/alerts-ui-shared';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { useDebounceFn } from '@kbn/react-hooks';
import { useFindTemplatesQuery } from '@kbn/response-ops-rules-apis/hooks/use_find_templates_query';
import { RuleTypeModal, type RuleTypeModalProps } from './rule_type_modal';
import { filterAndCountRuleTypes } from './helpers/filter_and_count_rule_types';

export interface RuleTypeModalComponentProps {
  http: HttpStart;
  toasts: ToastsStart;
  filteredRuleTypes: string[];
  registeredRuleTypes: RuleTypeModel[];
  onClose: RuleTypeModalProps['onClose'];
  onSelectRuleType: RuleTypeModalProps['onSelectRuleType'];
  onSelectTemplate: RuleTypeModalProps['onSelectTemplate'];
}

const EMPTY_ARRAY: string[] = [];
const DEBOUNCE_OPTIONS = { wait: 300 };

export const RuleTypeModalComponent: React.FC<RuleTypeModalComponentProps> = ({
  http,
  toasts,
  filteredRuleTypes = EMPTY_ARRAY,
  registeredRuleTypes,
  ...rest
}) => {
  const [selectedProducer, setSelectedProducer] = useState<string | null>(null);
  const [searchString, setSearchString] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<'ruleType' | 'template'>('ruleType');

  // Debounced search string for template API calls to avoid excessive requests
  const [debouncedSearchString, setDebouncedSearchString] = useState<string>('');
  const { run: updateDebouncedSearch } = useDebounceFn(setDebouncedSearchString, DEBOUNCE_OPTIONS);

  // Update both immediate and debounced search strings on user input
  const updateSearch = useCallback(
    (value: string) => {
      setSearchString(value);
      updateDebouncedSearch(value);
    },
    [updateDebouncedSearch]
  );

  const registeredRuleTypesWithAppContext = registeredRuleTypes.filter(
    ({ requiresAppContext }) => !requiresAppContext
  );
  const {
    ruleTypesState: { data: ruleTypeIndex, isLoading: ruleTypesLoading },
  } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes,
    registeredRuleTypes: registeredRuleTypesWithAppContext,
  });

  // Count producers before filtering. This is used to determine if we should show the categories,
  // and categories should only be hidden if there is only one producer BEFORE filters are applied,
  // e.g. on oblt serverless
  const hasOnlyOneProducer = useMemo(() => {
    const producerCount = countBy([...ruleTypeIndex.values()], 'producer');
    return Object.keys(producerCount).length === 1;
  }, [ruleTypeIndex]);

  const [ruleTypes, ruleTypeCountsByProducer] = useMemo(
    () => filterAndCountRuleTypes(ruleTypeIndex, selectedProducer, searchString),
    [ruleTypeIndex, searchString, selectedProducer]
  );

  const {
    templates,
    hasNextPage: hasMoreTemplates,
    fetchNextPage: loadMoreTemplates,
    isLoading: templatesLoading,
    isFetchingNextPage: templatesLoadingMore,
  } = useFindTemplatesQuery({
    http,
    toasts,
    enabled: selectedMode === 'template',
    perPage: 10,
    sortField: 'name',
    sortOrder: 'asc',
    search: debouncedSearchString || undefined,
  });

  return (
    <RuleTypeModal
      {...rest}
      ruleTypes={ruleTypes}
      ruleTypeCountsByProducer={ruleTypeCountsByProducer}
      ruleTypesLoading={ruleTypesLoading}
      onChangeSearch={updateSearch}
      onFilterByProducer={setSelectedProducer}
      selectedProducer={selectedProducer}
      searchString={searchString}
      showCategories={!hasOnlyOneProducer}
      selectedMode={selectedMode}
      onChangeMode={setSelectedMode}
      templates={templates}
      templatesLoading={templatesLoading}
      templatesLoadingMore={templatesLoadingMore}
      hasMoreTemplates={hasMoreTemplates ?? false}
      onLoadMoreTemplates={loadMoreTemplates}
    />
  );
};
