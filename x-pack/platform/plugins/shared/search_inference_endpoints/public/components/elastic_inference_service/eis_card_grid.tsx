/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGrid, EuiFlexItem, useCurrentEuiBreakpoint } from '@elastic/eui';
import { useContentListItems } from '@kbn/content-list-provider';
import { getItemModelId, toGroupedModel } from '../../utils/eis_content_list_utils';
import { ModelCard } from './model_card';

interface EisCardGridProps {
  onViewModelDetails: (modelId: string) => void;
}

export const EisCardGrid = ({ onViewModelDetails }: EisCardGridProps) => {
  const { items } = useContentListItems();
  const breakpoint = useCurrentEuiBreakpoint();

  return (
    <EuiFlexGrid columns={breakpoint === 'xl' ? 4 : 3} data-test-subj="eisModelCards">
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
