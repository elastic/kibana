/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ContentList, ContentListToolbar } from '@kbn/content-list';
import { EisCardGrid } from './eis_card_grid';
import { EisNoModelsPrompt } from './eis_no_models_prompt';
import { ModelFamilyFilterPart, TaskTypeFilterPart } from './eis_model_filters';
import { EisTable } from './eis_table';

export type EisViewMode = 'card' | 'table';

interface EisModelsListingProps {
  onViewModelDetails: (modelId: string) => void;
}

const VIEW_MODE_OPTIONS = [
  {
    id: 'card',
    iconType: 'grid',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.cardView', {
      defaultMessage: 'Card view',
    }),
  },
  {
    id: 'table',
    iconType: 'list',
    label: i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.tableView', {
      defaultMessage: 'Table view',
    }),
  },
];

export const EisModelsListing = ({ onViewModelDetails }: EisModelsListingProps) => {
  const [viewMode, setViewMode] = useState<EisViewMode>('card');

  return (
    <ContentList emptyState={<EisNoModelsPrompt />}>
      <EuiFlexGroup alignItems="flexStart" gutterSize="s">
        <EuiFlexItem>
          <ContentListToolbar>
            <ContentListToolbar.Filters>
              <ModelFamilyFilterPart />
              <TaskTypeFilterPart />
            </ContentListToolbar.Filters>
          </ContentListToolbar>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.searchInferenceEndpoints.eisModelspage.viewMode', {
              defaultMessage: 'View mode',
            })}
            options={VIEW_MODE_OPTIONS}
            idSelected={viewMode}
            onChange={(id) => setViewMode(id as EisViewMode)}
            // `m` is form-control height, matching the toolbar's search box and filter buttons.
            buttonSize="m"
            isIconOnly
            data-test-subj="eisModelsViewModeSelector"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {viewMode === 'table' ? (
        <EisTable {...{ onViewModelDetails }} />
      ) : (
        <EisCardGrid {...{ onViewModelDetails }} />
      )}
    </ContentList>
  );
};
