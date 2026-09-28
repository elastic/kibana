/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiAvatar,
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ContentListTable, type ContentListItem } from '@kbn/content-list';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import { getProviderKeyForCreator } from '../../utils/eis_utils';
import {
  EIS_PROVIDER_FILTER_ID,
  getItemModelId,
  toGroupedModel,
} from '../../utils/eis_content_list_utils';

const { Column } = ContentListTable;

interface EisTableProps {
  onViewModelDetails: (modelId: string) => void;
}

const renderProvider = (item: ContentListItem) => {
  const { modelCreator } = toGroupedModel(item);
  const providerKey = getProviderKeyForCreator(modelCreator);
  const provider = providerKey ? SERVICE_PROVIDERS[providerKey] : undefined;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiAvatar
          name={modelCreator}
          iconType={provider?.icon ?? 'machineLearningApp'}
          color="subdued"
          size="s"
          type="space"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">{modelCreator}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const renderCategories = (item: ContentListItem) => (
  <EuiBadgeGroup>
    {toGroupedModel(item).categories.map((category) => (
      <EuiBadge key={category} color="hollow">
        {category}
      </EuiBadge>
    ))}
  </EuiBadgeGroup>
);

export const EisTable = ({ onViewModelDetails }: EisTableProps) => (
  <ContentListTable
    title={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.tableTitle', {
      defaultMessage: 'Elastic Inference Service models',
    })}
  >
    <Column.Name
      columnTitle={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.column.model', {
        defaultMessage: 'Model',
      })}
      onClick={(item) => {
        const modelId = getItemModelId(item);
        if (modelId) {
          onViewModelDetails(modelId);
        }
      }}
    />
    <Column
      id={EIS_PROVIDER_FILTER_ID}
      name={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.column.provider', {
        defaultMessage: 'Provider',
      })}
      width="16em"
      sortable
      render={renderProvider}
    />
    <Column
      id="categories"
      name={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.column.type', {
        defaultMessage: 'Type',
      })}
      width="12em"
      render={renderCategories}
    />
  </ContentListTable>
);
