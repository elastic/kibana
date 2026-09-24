/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { ContentListProvider } from '@kbn/content-list-provider';
import {
  DEFAULT_EIS_DISPLAY_OPTIONS,
  getProviderOptions,
  type GroupedModel,
} from '../../utils/eis_utils';
import {
  createEisFieldDefinitions,
  createEisFindItems,
  EIS_END_OF_LIFE_SORT_FIELD,
  EIS_NAME_SORT_FIELD,
  EIS_PROVIDER_FILTER_ID,
  EIS_RELEASED_SORT_FIELD,
  EIS_TYPE_SORT_FIELD,
} from '../../utils/eis_content_list_utils';
import { EisModelsListing, type EisViewMode } from './eis_models_listing';
import { ModelFamilyOptionsProvider } from './eis_model_filters';

interface EisModelsListingProviderProps {
  models: GroupedModel[];
  /** Mirrors `useInferenceCapabilities().canManage`; the listing itself is read-only without it. */
  canManage: boolean;
  onViewModelDetails: (modelId: string) => void;
}

const LABELS = {
  entity: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.entity', {
    defaultMessage: 'model',
  }),
  entityPlural: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.entityPlural', {
    defaultMessage: 'models',
  }),
  searchPlaceholder: i18n.translate(
    'xpack.searchInferenceEndpoints.eisModelsPage.searchPlaceholder',
    { defaultMessage: 'Search Elastic Inference Service models...' }
  ),
};

const SORT_FIELDS = [
  {
    field: EIS_NAME_SORT_FIELD,
    name: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.model', {
      defaultMessage: 'Model',
    }),
  },
  {
    field: EIS_TYPE_SORT_FIELD,
    name: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.type', {
      defaultMessage: 'Type',
    }),
  },
  {
    field: EIS_PROVIDER_FILTER_ID,
    name: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.provider', {
      defaultMessage: 'Provider',
    }),
  },
  {
    field: EIS_RELEASED_SORT_FIELD,
    name: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.released', {
      defaultMessage: 'Released',
    }),
  },
  {
    field: EIS_END_OF_LIFE_SORT_FIELD,
    name: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.endOfLife', {
      defaultMessage: 'End of Life',
    }),
  },
];

export const EisModelsListingProvider = ({
  models,
  canManage,
  onViewModelDetails,
}: EisModelsListingProviderProps) => {
  const [displayOptions, setDisplayOptions] = useState(DEFAULT_EIS_DISPLAY_OPTIONS);
  const [viewMode, setViewMode] = useState<EisViewMode>('card');
  const dataSource = useMemo(
    () => ({ findItems: createEisFindItems(models, displayOptions, viewMode === 'table') }),
    [models, displayOptions, viewMode]
  );
  const fields = useMemo(() => createEisFieldDefinitions(models), [models]);
  const modelFamilyOptions = useMemo(() => getProviderOptions(models), [models]);
  const queryKeyScope = `eis-models-listing-${viewMode}-${Number(
    displayOptions.showOutsideRegionPreferences
  )}-${Number(displayOptions.showEndOfLifeModels)}-${Number(displayOptions.showPreviewModels)}`;
  const hasBlockedModels = useMemo(
    () =>
      models.some((model) =>
        model.endpoints.some((endpoint) => endpoint.metadata?.denied_by_region_policy === true)
      ),
    [models]
  );

  const features = useMemo(
    () => ({
      sorting: {
        initialSort: { field: EIS_NAME_SORT_FIELD, direction: 'asc' as const },
        fields: SORT_FIELDS,
      },
      pagination: {
        initialPageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
      },
      search: true,
      // No bulk actions: endpoints are deleted one at a time from the detail flyout.
      selection: false as const,
      fields,
    }),
    [fields]
  );

  return (
    <ContentListProvider
      id="eis-models"
      queryKeyScope={queryKeyScope}
      labels={LABELS}
      isReadOnly={!canManage}
      {...{ dataSource, features }}
    >
      <ModelFamilyOptionsProvider value={modelFamilyOptions}>
        <EisModelsListing
          {...{ onViewModelDetails, displayOptions, hasBlockedModels, viewMode }}
          onApplyDisplayOptions={setDisplayOptions}
          onViewModeChange={setViewMode}
        />
      </ModelFamilyOptionsProvider>
    </ContentListProvider>
  );
};
