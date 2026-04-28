/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { DataSetListItem } from '../common/sample_data_sets_client';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { dataSourcePreviewFlyoutStrings } from './data_source_preview_flyout_i18n';
import { getDataSourceTypeLabel } from './get_data_source_type_label';

export interface DataSourcePreviewFlyoutProps {
  source: DataSourceListItem;
  /** Data sets whose `sourceName` matches this source. */
  sets: DataSetListItem[];
  onClose: () => void;
}

export const DataSourcePreviewFlyout: FunctionComponent<DataSourcePreviewFlyoutProps> = ({
  source,
  sets,
  onClose,
}) => {
  const setupListItems = useMemo(
    () => [
      {
        title: i18n.translate('dataSourceManagement.previewFlyout.typeTitle', {
          defaultMessage: 'Type',
        }),
        description: getDataSourceTypeLabel(source.type),
      },
      {
        title: i18n.translate('dataSourceManagement.previewFlyout.descriptionTitle', {
          defaultMessage: 'Description',
        }),
        description:
          source.description.trim().length > 0 ? (
            source.description
          ) : (
            <EuiText color="subdued" size="s">
              {i18n.translate('dataSourceManagement.previewFlyout.noDescription', {
                defaultMessage: 'None',
              })}
            </EuiText>
          ),
      },
    ],
    [source]
  );

  const setColumns = useMemo<Array<EuiBasicTableColumn<DataSetListItem>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.previewFlyout.setsColumnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        width: '34%',
        'data-test-subj': 'dataSourcePreviewFlyoutSetsColName',
      },
      {
        field: 'description',
        name: i18n.translate('dataSourceManagement.previewFlyout.setsColumnDescription', {
          defaultMessage: 'Description',
        }),
        sortable: true,
        truncateText: true,
        'data-test-subj': 'dataSourcePreviewFlyoutSetsColDescription',
      },
    ],
    []
  );

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby="dataSourcePreviewFlyoutTitle"
      size="m"
      data-test-subj="dataSourcePreviewFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="dataSourcePreviewFlyoutTitle">{source.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="xxs">
          <h3>{dataSourcePreviewFlyoutStrings.setupHeading()}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiDescriptionList listItems={setupListItems} compressed />
        <EuiSpacer size="l" />
        <EuiTitle size="xxs">
          <h3>{dataSourcePreviewFlyoutStrings.setsHeading()}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {sets.length === 0 ? (
          <EuiText color="subdued" size="s" data-test-subj="dataSourcePreviewFlyoutEmptySets">
            {dataSourcePreviewFlyoutStrings.emptySets()}
          </EuiText>
        ) : (
          <EuiInMemoryTable<DataSetListItem>
            items={sets}
            itemId="id"
            columns={setColumns}
            sorting
            pagination={{
              pageSizeOptions: [5, 10],
              initialPageSize: 5,
            }}
            data-test-subj="dataSourcePreviewFlyoutSetsTable"
            tableCaption={dataSourcePreviewFlyoutStrings.setsTableCaption()}
            tableLayout="auto"
            responsiveBreakpoint={false}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="dataSourcePreviewFlyoutClose"
              onClick={onClose}
            >
              {dataSourcePreviewFlyoutStrings.closeButton()}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
