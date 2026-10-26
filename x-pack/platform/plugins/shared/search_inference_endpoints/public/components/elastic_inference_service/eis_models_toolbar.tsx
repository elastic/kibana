/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  type EuiButtonGroupOptionProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ContentListToolbar } from '@kbn/content-list';
import type { EisViewMode } from '../../types';
import type { EisDisplayOptions } from '../../utils/eis_utils';
import { useDisplayOptionsTour } from '../../hooks/use_display_options_tour';
import { DisplayOptions } from './display_options';
import { ModelTypeFilterPart, ModelFamilyFilterPart } from './eis_model_filters';
import { RegionFilterPart } from './region_filter';

type EisViewModeOption = Omit<EuiButtonGroupOptionProps, 'id'> & { id: EisViewMode };

interface EisModelsToolbarProps {
  displayOptions: EisDisplayOptions;
  onApplyDisplayOptions: (next: EisDisplayOptions) => void;
  hasBlockedModels: boolean;
  viewMode: EisViewMode;
  onViewModeChange: (viewMode: EisViewMode) => void;
}

const VIEW_MODE_OPTIONS: EisViewModeOption[] = [
  {
    id: 'card',
    'data-test-subj': 'eisModelsViewModeSelector-card',
    iconType: 'grid',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.cardView', {
      defaultMessage: 'Card view',
    }),
  },
  {
    id: 'table',
    'data-test-subj': 'eisModelsViewModeSelector-table',
    iconType: 'list',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.tableView', {
      defaultMessage: 'Table view',
    }),
  },
];

const isEisViewMode = (id: string): id is EisViewMode =>
  VIEW_MODE_OPTIONS.some((option) => option.id === id);

export const EisModelsToolbar = ({
  displayOptions,
  onApplyDisplayOptions,
  hasBlockedModels,
  viewMode,
  onViewModeChange,
}: EisModelsToolbarProps) => {
  const { isTourOpen, dismissTour, hideTour } = useDisplayOptionsTour(hasBlockedModels);

  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <ContentListToolbar>
          <ContentListToolbar.Filters>
            <ModelTypeFilterPart />
            <ModelFamilyFilterPart />
            <RegionFilterPart />
          </ContentListToolbar.Filters>
        </ContentListToolbar>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          legend={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.viewMode', {
            defaultMessage: 'View mode',
          })}
          options={VIEW_MODE_OPTIONS}
          idSelected={viewMode}
          onChange={(id) => {
            if (isEisViewMode(id)) {
              onViewModeChange(id);
            }
          }}
          buttonSize="m"
          isIconOnly
          data-test-subj="eisModelsViewModeSelector"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DisplayOptions
          value={displayOptions}
          onApply={onApplyDisplayOptions}
          onOpen={hideTour}
          isTourOpen={isTourOpen}
          onDismissTour={dismissTour}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
