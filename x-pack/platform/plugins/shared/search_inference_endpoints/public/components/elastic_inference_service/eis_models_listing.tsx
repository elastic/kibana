/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ContentList, ContentListFooter } from '@kbn/content-list';
import type { EisViewMode } from '../../types';
import type { EisDisplayOptions } from '../../utils/eis_utils';
import { EisCardGrid } from './eis_card_grid';
import { EisNoModelsPrompt } from './eis_no_models_prompt';
import { EisTable } from './eis_table';
import { EisCardViewHeader } from './eis_card_view_header';
import { EisModelsToolbar } from './eis_models_toolbar';

interface EisModelsListingProps {
  onViewModelDetails: (modelId: string) => void;
  displayOptions: EisDisplayOptions;
  onApplyDisplayOptions: (next: EisDisplayOptions) => void;
  hasBlockedModels: boolean;
  viewMode: EisViewMode;
  onViewModeChange: (viewMode: EisViewMode) => void;
  catalogTotal: number;
}

export const EisModelsListing = ({
  onViewModelDetails,
  displayOptions,
  onApplyDisplayOptions,
  hasBlockedModels,
  viewMode,
  onViewModeChange,
  catalogTotal,
}: EisModelsListingProps) => (
  <ContentList emptyState={<EisNoModelsPrompt />}>
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EisModelsToolbar
          {...{
            displayOptions,
            onApplyDisplayOptions,
            hasBlockedModels,
            viewMode,
            onViewModeChange,
          }}
        />
      </EuiFlexItem>
      {viewMode === 'card' ? (
        <>
          <EuiFlexItem grow={false}>
            <EisCardViewHeader catalogTotal={catalogTotal} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EisCardGrid {...{ onViewModelDetails }} />
          </EuiFlexItem>
        </>
      ) : (
        <EuiFlexItem>
          <EisTable {...{ onViewModelDetails }} />
          <ContentListFooter />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </ContentList>
);
