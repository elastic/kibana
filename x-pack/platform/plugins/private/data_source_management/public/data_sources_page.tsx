/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPageSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { SampleDataSourcesClient } from '../common/sample_data_sources_client';

export interface DataSourcesPageProps {
  pageTitle: string;
}

export const DataSourcesPage: FunctionComponent<DataSourcesPageProps> = ({ pageTitle }) => {
  const dataClient = useMemo(() => new SampleDataSourcesClient(), []);
  const [items, setItems] = useState<DataSourceListItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<DataSourceListItem[]>([]);

  useEffect(() => {
    setItems(dataClient.get());
  }, [dataClient]);

  const columns: Array<EuiBasicTableColumn<DataSourceListItem>> = [
    {
      field: 'name',
      name: i18n.translate('dataSourceManagement.table.columnName', {
        defaultMessage: 'Name',
      }),
      sortable: true,
      width: '28%',
      'data-test-subj': 'dataSourceManagementColName',
    },
    {
      field: 'description',
      name: i18n.translate('dataSourceManagement.table.columnDescription', {
        defaultMessage: 'Description',
      }),
      sortable: true,
      truncateText: true,
      'data-test-subj': 'dataSourceManagementColDescription',
    },
  ];

  return (
    <EuiPageSection paddingSize="m">
      <EuiTitle size="l">
        <h1 data-test-subj="dataSourceManagementPageTitle">{pageTitle}</h1>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiInMemoryTable<DataSourceListItem>
        items={items}
        itemId="id"
        columns={columns}
        search={{
          box: {
            incremental: true,
            placeholder: i18n.translate('dataSourceManagement.search.placeholder', {
              defaultMessage: 'Search data sources…',
            }),
            'data-test-subj': 'dataSourceManagementSearch',
            schema: {
              fields: {
                name: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
          toolsLeft:
            selectedItems.length > 0 ? (
              <EuiButton
                color="danger"
                data-test-subj="dataSourceManagementDeleteButton"
                iconType="trash"
                onClick={() => {
                  dataClient.delete(selectedItems.map((item) => item.name));
                  setItems(dataClient.get());
                  setSelectedItems([]);
                }}
              >
                {i18n.translate('dataSourceManagement.deleteButtonLabel', {
                  defaultMessage: 'Delete',
                })}
              </EuiButton>
            ) : undefined,
          toolsRight: (
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="primary"
                  data-test-subj="dataSourceManagementCreateButton"
                  iconType="plusInCircle"
                  onClick={() => {
                    window.alert('create');
                  }}
                >
                  {i18n.translate('dataSourceManagement.addButtonLabel', {
                    defaultMessage: 'Add',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  color="primary"
                  display="fill"
                  iconType="refresh"
                  aria-label={i18n.translate('dataSourceManagement.refreshButtonAriaLabel', {
                    defaultMessage: 'Refresh',
                  })}
                  data-test-subj="dataSourceManagementRefreshButton"
                  onClick={() => {
                    setItems(dataClient.get());
                    setSelectedItems([]);
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
        }}
        rowHeader="name"
        selection={{
          selected: selectedItems,
          onSelectionChange: setSelectedItems,
        }}
        sorting
        pagination={{
          pageSizeOptions: [5, 10, 20],
          initialPageSize: 10,
        }}
        data-test-subj="dataSourceManagementTable"
        tableCaption={i18n.translate('dataSourceManagement.table.caption', {
          defaultMessage: 'Data sources',
        })}
        noItemsMessage={i18n.translate('dataSourceManagement.table.noItems', {
          defaultMessage: 'No data sources found',
        })}
        tableLayout="auto"
        responsiveBreakpoint={false}
      />
    </EuiPageSection>
  );
};
