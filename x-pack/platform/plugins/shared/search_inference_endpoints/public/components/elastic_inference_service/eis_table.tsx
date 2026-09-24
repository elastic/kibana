/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ContentListTable, type ContentListItem } from '@kbn/content-list';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import {
  getModelEOLDate,
  getModelReleaseDate,
  getProviderKeyForCreator,
} from '../../utils/eis_utils';
import {
  EIS_END_OF_LIFE_SORT_FIELD,
  EIS_PROVIDER_FILTER_ID,
  EIS_RELEASED_SORT_FIELD,
  EIS_TYPE_SORT_FIELD,
  getItemModelId,
  toGroupedModel,
} from '../../utils/eis_content_list_utils';
import { EisTableDateCell } from './eis_table_date_cell';

const { Column } = ContentListTable;

interface EisTableProps {
  onViewModelDetails: (modelId: string) => void;
}

export const EisTable = ({ onViewModelDetails }: EisTableProps) => (
  <ContentListTable
    title={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.tableTitle', {
      defaultMessage: 'Elastic Inference Service models',
    })}
  >
    <Column.Name
      columnTitle={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.column.model', {
        defaultMessage: 'Model name',
      })}
      width="40em"
      render={(item) => {
        const modelId = getItemModelId(item);
        const { modelCreator } = toGroupedModel(item);
        const providerKey = getProviderKeyForCreator(modelCreator);
        const provider = providerKey ? SERVICE_PROVIDERS[providerKey] : undefined;
        return (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={provider?.icon ?? 'machineLearningApp'} size="m" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {modelId ? (
                <EuiLink
                  onClick={() => onViewModelDetails(modelId)}
                  data-test-subj="content-list-table-item-link"
                >
                  {item.title}
                </EuiLink>
              ) : (
                <EuiText size="s">{item.title}</EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }}
    />
    <Column
      id={EIS_TYPE_SORT_FIELD}
      name={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.column.type', {
        defaultMessage: 'Type',
      })}
      width="12em"
      sortable
      data-test-subj="eisTableType"
      render={(item: ContentListItem) => {
        const { categories } = toGroupedModel(item);
        return categories.length > 0 ? categories.join(', ') : '--';
      }}
    />
    <Column
      id={EIS_PROVIDER_FILTER_ID}
      name={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.column.provider', {
        defaultMessage: 'Provider',
      })}
      width="12em"
      sortable
      data-test-subj="eisTableProvider"
      render={(item: ContentListItem) => toGroupedModel(item).modelCreator}
    />
    <Column
      id={EIS_RELEASED_SORT_FIELD}
      name={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.column.released', {
        defaultMessage: 'Released',
      })}
      width="12em"
      sortable
      data-test-subj="eisTableReleased"
      render={(item: ContentListItem) => (
        <EisTableDateCell
          formattedDate={getModelReleaseDate(toGroupedModel(item).modelMetadata)?.format(
            'YYYY-MM-DD'
          )}
        />
      )}
    />
    <Column
      id={EIS_END_OF_LIFE_SORT_FIELD}
      name={i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.column.endOfLife', {
        defaultMessage: 'End of Life',
      })}
      width="12em"
      sortable
      data-test-subj="eisTableEndOfLife"
      render={(item: ContentListItem) => (
        <EisTableDateCell
          formattedDate={getModelEOLDate(toGroupedModel(item).modelMetadata)?.format('YYYY-MM-DD')}
        />
      )}
    />
  </ContentListTable>
);
