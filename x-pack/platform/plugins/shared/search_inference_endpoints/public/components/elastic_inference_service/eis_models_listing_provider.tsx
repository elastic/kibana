/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { ContentListProvider } from '@kbn/content-list-provider';
import { getProviderOptions, type GroupedModel } from '../../utils/eis_utils';
import {
  createEisFieldDefinitions,
  createEisFindItems,
  EIS_NAME_SORT_FIELD,
  EIS_PROVIDER_FILTER_ID,
} from '../../utils/eis_content_list_utils';
import { EisModelsListing } from './eis_models_listing';
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
    field: EIS_PROVIDER_FILTER_ID,
    name: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.sort.provider', {
      defaultMessage: 'Provider',
    }),
  },
];

export const EisModelsListingProvider = ({
  models,
  canManage,
  onViewModelDetails,
}: EisModelsListingProviderProps) => {
  const dataSource = useMemo(() => ({ findItems: createEisFindItems(models) }), [models]);
  const fields = useMemo(() => createEisFieldDefinitions(models), [models]);
  const modelFamilyOptions = useMemo(() => getProviderOptions(models), [models]);

  const features = useMemo(
    () => ({
      sorting: {
        initialSort: { field: EIS_NAME_SORT_FIELD, direction: 'asc' as const },
        fields: SORT_FIELDS,
      },
      // Every EIS model is fetched in one request and rendered as a card grid.
      pagination: false as const,
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
      labels={LABELS}
      isReadOnly={!canManage}
      {...{ dataSource, features }}
    >
      <ModelFamilyOptionsProvider value={modelFamilyOptions}>
        <EisModelsListing {...{ onViewModelDetails }} />
      </ModelFamilyOptionsProvider>
    </ContentListProvider>
  );
};
