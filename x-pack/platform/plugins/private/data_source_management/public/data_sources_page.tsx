/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable, EuiPageSection, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { DataSourceListItem } from '../common/sample_data_sources';
import { SAMPLE_DATA_SOURCES } from '../common/sample_data_sources';

export interface DataSourcesPageProps {
  pageTitle: string;
}

export const DataSourcesPage: FunctionComponent<DataSourcesPageProps> = ({ pageTitle }) => {
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
        items={SAMPLE_DATA_SOURCES}
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
