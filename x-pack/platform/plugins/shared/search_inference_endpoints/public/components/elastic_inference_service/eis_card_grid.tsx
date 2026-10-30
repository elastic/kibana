/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGrid,
  EuiFlexItem,
  useCurrentEuiBreakpoint,
  useEuiTheme,
  type UseEuiTheme,
} from '@elastic/eui';
import { useContentListItems } from '@kbn/content-list-provider';
import { getItemModelId, toGroupedModel } from '../../utils/eis_content_list_utils';
import { EisNoModelsPrompt } from './eis_no_models_prompt';
import { ModelCard } from './model_card';

interface EisCardGridProps {
  onViewModelDetails: (modelId: string) => void;
}

const cardGridStyles = ({ euiTheme }: UseEuiTheme) => ({
  paddingTop: euiTheme.size.s,
});

export const EisCardGrid = ({ onViewModelDetails }: EisCardGridProps) => {
  const { items } = useContentListItems();
  const breakpoint = useCurrentEuiBreakpoint();
  const euiThemeContext = useEuiTheme();

  // ContentList owns the initially-empty state, while filtered zero-result
  // queries remain in the ready phase and render this child.
  if (items.length === 0) {
    return <EisNoModelsPrompt />;
  }

  return (
    <EuiFlexGrid
      columns={breakpoint === 'xl' ? 4 : 3}
      data-test-subj="eisModelCards"
      gutterSize="m"
      css={cardGridStyles(euiThemeContext)}
    >
      {items.map((item) => {
        const modelId = getItemModelId(item);
        return (
          <EuiFlexItem key={item.id}>
            <ModelCard
              model={toGroupedModel(item)}
              onClick={() => modelId && onViewModelDetails(modelId)}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGrid>
  );
};
