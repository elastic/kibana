/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  useCurrentEuiBreakpoint,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { EisCloudConnectPromoCallout, useCloudConnectStatus } from '@kbn/search-api-panels';
import { CLOUD_CONNECT_NAV_ID } from '@kbn/deeplinks-management/constants';
import { INFERENCE_ENDPOINTS_QUERY_KEY } from '../../../common/constants';
import { useEisModels } from '../../hooks/use_eis_models';
import { useEndpointActions } from '../../hooks/use_endpoint_actions';
import { getModelId } from '../../utils/get_model_id';
import { ModelCard } from './model_card';
import { ModelDetailFlyout } from '../model_detail_flyout/model_detail_flyout';
import { DeleteAction } from '../all_inference_endpoints/render_table_columns/render_actions/actions/delete/delete_action';
import {
  filterGroupedModels,
  getProviderOptions,
  groupEndpointsByModel,
  TASK_TYPE_FILTERS,
  type TaskTypeCategory,
} from '../../utils/eis_utils';
import { ModelFamilyFilter } from './model_family_filter';
import { useKibana } from '../../hooks/use_kibana';

export const ElasticInferenceServiceModelsPage = () => {
  const {
    services: { application, cloud, cloudConnect },
  } = useKibana();
  const { isLoading: isCloudConnectStatusLoading, isCloudConnected } = useCloudConnectStatus(
    cloudConnect?.hooks.useCloudConnectStatus
  );
  const queryClient = useQueryClient();
  const { data: endpoints, isLoading, isError } = useEisModels();
  const {
    showDeleteAction,
    selectedInferenceEndpoint,
    copyContent,
    onCancelDeleteModal,
    displayDeleteActionItem,
  } = useEndpointActions();
  const breakpoint = useCurrentEuiBreakpoint();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<Set<TaskTypeCategory>>(new Set());
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

  const onModelDetailFlyoutClose = useCallback(() => {
    setSelectedModelId(undefined);
  }, []);

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
    <>
      {!isCloudConnectStatusLoading && !isCloudConnected && (
        <EisCloudConnectPromoCallout
          promoId="elasticInferencePage"
          isSelfManaged={!cloud?.isCloudEnabled}
          direction="row"
          navigateToApp={() =>
            application.navigateToApp(CLOUD_CONNECT_NAV_ID, { openInNewTab: true })
          }
          addSpacer="top"
        />
      )}
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem grow={true}>
              <EuiFieldSearch
                placeholder={i18n.translate(
                  'xpack.searchInferenceEndpoints.eisModelspage.searchPlaceholder',
                  { defaultMessage: 'Search Elastic Inference Service models...' }
                )}
                value={searchQuery}
                fullWidth={true}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={i18n.translate(
                  'xpack.searchInferenceEndpoints.eisModelspage.searchbar',
                  {
                    defaultMessage: 'Search Elastic Inference Service models',
                  }
                )}
                data-test-subj="eisModelsSearchBar"
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
                    data-test-subj={`eisTaskTypeFilter-${category}`}
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
              data-test-subj="eisNoModelsFound"
              title={
                <h3>
                  {i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.noResults', {
                    defaultMessage: 'No models found',
                  })}
                </h3>
              }
            />
          ) : (
            <EuiFlexGrid columns={breakpoint === 'xl' ? 4 : 3} data-test-subj="eisModelCards">
              {filtered.map((m) => (
                <EuiFlexItem key={`${m.service}::${m.modelName}`}>
                  <ModelCard
                    model={m}
                    onClick={() => {
                      const modelId = getModelId(m.endpoints[0]);
                      if (modelId) {
                        setSelectedModelId(modelId);
                      }
                    }}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGrid>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      {showDeleteAction && selectedInferenceEndpoint && (
        <DeleteAction
          selectedEndpoint={selectedInferenceEndpoint}
          displayModal={showDeleteAction}
          onCancel={onCancelDeleteModal}
        />
      )}
      {selectedModelId && endpoints && (
        <ModelDetailFlyout
          modelId={selectedModelId}
          allEndpoints={endpoints}
          onClose={onModelDetailFlyoutClose}
          onSaveEndpoint={() => queryClient.invalidateQueries([INFERENCE_ENDPOINTS_QUERY_KEY])}
          onDeleteEndpoint={displayDeleteActionItem}
          onCopyEndpointId={copyContent}
        />
      )}
    </>
  );
};
