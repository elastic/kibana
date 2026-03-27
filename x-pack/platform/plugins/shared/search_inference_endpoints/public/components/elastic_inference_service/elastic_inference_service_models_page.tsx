/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import {
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEisModels } from '../../hooks/use_eis_models';
import { ModelCard } from './model_card';
import {
  filterGroupedModels,
  getProviderOptions,
  groupEndpointsByModel,
  TASK_TYPE_FILTERS,
  type TaskTypeCategory,
} from '../../utils/eis_utils';
import { ModelFamilyFilter } from './model_family_filter';

export const ElasticInferenceServiceModelsPage = () => {
  const { data: endpoints, isLoading, isError } = useEisModels();
  const breakpoint = useCurrentEuiBreakpoint();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<Set<TaskTypeCategory>>(new Set());
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  const groupedModels = useMemo(
    () => (endpoints ? groupEndpointsByModel(endpoints) : []),
    [endpoints]
  );

  const providerOptions = useMemo(() => getProviderOptions(groupedModels), [groupedModels]);

  const filtered = useMemo(
    () => filterGroupedModels(groupedModels, { searchQuery, selectedTaskTypes, selectedProviders }),
    [groupedModels, searchQuery, selectedTaskTypes, selectedProviders]
  );

  const toggleTaskType = (category: TaskTypeCategory) =>
    setSelectedTaskTypes((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });

  if (isLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  if (isError) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        title={
          <h2>
            {i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.error.title', {
              defaultMessage: 'Unable to load models',
            })}
          </h2>
        }
        body={i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.error.body', {
          defaultMessage: 'An error occurred while fetching model data.',
        })}
      />
    );
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiFieldSearch
              placeholder={i18n.translate(
                'xpack.searchInferenceEndpoints.eisModelspage.searchPlaceholder',
                { defaultMessage: 'Search models...' }
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.searchbar', {
                defaultMessage: 'Find Elastic Inference Service models',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup>
              <ModelFamilyFilter
                options={providerOptions}
                selectedOptionKeys={selectedProviders}
                onChange={(newOptions) => {
                  setSelectedProviders(
                    newOptions.filter((o) => o.checked === 'on').map((o) => o.key)
                  );
                }}
              />
              {TASK_TYPE_FILTERS.map(({ category, label }, idx) => (
                <EuiFilterButton
                  key={category}
                  withNext={idx < TASK_TYPE_FILTERS.length - 1}
                  grow={false}
                  hasActiveFilters={selectedTaskTypes.has(category)}
                  isSelected={selectedTaskTypes.has(category)}
                  isToggle
                  onClick={() => toggleTaskType(category)}
                >
                  {label}
                </EuiFilterButton>
              ))}
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        {filtered.length === 0 ? (
          <EuiEmptyPrompt
            title={
              <h3>
                {i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.noResults', {
                  defaultMessage: 'No models found',
                })}
              </h3>
            }
          />
        ) : (
          <EuiFlexGrid columns={breakpoint === 'xl' ? 4 : 3}>
            {filtered.map((m) => (
              <EuiFlexItem key={`${m.service}::${m.modelName}`}>
                <ModelCard model={m} />
              </EuiFlexItem>
            ))}
          </EuiFlexGrid>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
