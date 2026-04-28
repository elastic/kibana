/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiButton,
  EuiInMemoryTable,
  EuiLink,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
} from '@elastic/eui';
import type { DataSourceWithSecrets } from '../common';
import type { DataSetListItem } from '../common/sample_data_sets_client';
import { SampleDataSetsClient } from '../common/sample_data_sets_client';
import type { DataSourceListItem } from '../common/sample_data_sources_client';
import { SampleDataSourcesClient } from '../common/sample_data_sources_client';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import { DataSourcePreviewFlyout } from './data_source_preview_flyout';
import { getDataSourceTypeLabel } from './get_data_source_type_label';

export interface DataSourcesPageProps {
  pageTitle: string;
}

export const DataSourcesPage: FunctionComponent<DataSourcesPageProps> = ({ pageTitle }) => {
  const dataClient = useMemo(() => new SampleDataSourcesClient(), []);
  const dataSetsClient = useMemo(() => new SampleDataSetsClient(), []);
  const [items, setItems] = useState<DataSourceListItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<DataSourceListItem[]>([]);
  const [dataSetItems, setDataSetItems] = useState<DataSetListItem[]>([]);
  const [isCreateFlyoutOpen, setCreateFlyoutOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState<DataSourceListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextItems = await dataClient.get();
      if (!cancelled) {
        setItems(nextItems);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataClient]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextItems = await dataSetsClient.get();
      if (!cancelled) {
        setDataSetItems(nextItems);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataSetsClient]);

  useEffect(() => {
    if (previewSource && !items.some((row) => row.id === previewSource.id)) {
      setPreviewSource(null);
    }
  }, [items, previewSource]);

  const previewSets = useMemo(
    () =>
      previewSource
        ? dataSetItems.filter((setItem) => setItem.sourceName === previewSource.name)
        : [],
    [dataSetItems, previewSource]
  );

  const handleCreateDataSourceSave = useCallback(
    async (values: {
      name: string;
      dataSource: Omit<DataSourceWithSecrets, 'id'>;
    }): Promise<string | null> => {
      try {
        await dataClient.add(values);
        setItems(await dataClient.get());
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Unknown error';
      }
    },
    [dataClient]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DataSourceListItem>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('dataSourceManagement.table.columnName', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        width: '24%',
        render: (value: string, record: DataSourceListItem) => (
          <EuiLink
            color="primary"
            data-test-subj={`dataSourceManagementNameLink-${record.id}`}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              setPreviewSource(record);
            }}
          >
            {value}
          </EuiLink>
        ),
        'data-test-subj': 'dataSourceManagementColName',
      },
      {
        field: 'type',
        name: i18n.translate('dataSourceManagement.table.columnType', {
          defaultMessage: 'Type',
        }),
        sortable: true,
        width: '20%',
        render: (value: DataSourceListItem['type']) => getDataSourceTypeLabel(value),
        'data-test-subj': 'dataSourceManagementColType',
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
    ],
    [setPreviewSource]
  );

  return (
    <>
      <EuiPageSection paddingSize="m">
        <EuiPageHeader
          bottomBorder
          data-test-subj="dataSourceManagementPageHeader"
          pageTitle={
            <span data-test-subj="dataSourceManagementPageTitle">{pageTitle}</span>
          }
          rightSideItems={[
            <EuiButton
              key="dataSourceManagementCreate"
              color="primary"
              fill
              data-test-subj="dataSourceManagementCreateButton"
              iconType="plusInCircle"
              onClick={() => {
                setCreateFlyoutOpen(true);
              }}
            >
              {i18n.translate('dataSourceManagement.addButtonLabel', {
                defaultMessage: 'Add',
              })}
            </EuiButton>,
          ]}
        />
        <EuiSpacer size="l" />
        <EuiSpacer size="m" />
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
                  type: { type: 'string' },
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
                    void (async () => {
                      await dataClient.delete(selectedItems.map((item) => item.name));
                      setItems(await dataClient.get());
                      setSelectedItems([]);
                    })();
                  }}
                >
                  {i18n.translate('dataSourceManagement.deleteButtonLabel', {
                    defaultMessage: 'Delete',
                  })}
                </EuiButton>
              ) : undefined,
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
      {isCreateFlyoutOpen ? (
        <CreateDataSourceFlyout
          onClose={() => setCreateFlyoutOpen(false)}
          onSave={handleCreateDataSourceSave}
        />
      ) : null}
      {previewSource ? (
        <DataSourcePreviewFlyout
          source={previewSource}
          sets={previewSets}
          onClose={() => setPreviewSource(null)}
        />
      ) : null}
    </>
  );
};
