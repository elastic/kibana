/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFieldSearch, EuiInMemoryTable, EuiSpacer } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { ImportListItem } from '../../hooks/use_fetch_imports';
import { ImportActionsMenu } from './import_actions_menu';

const CONNECTOR_TYPE_LABELS: Readonly<Record<string, string>> = {
  '.datadog': i18n.translate('xpack.alertingV2.imports.list.type.datadog', {
    defaultMessage: 'Datadog',
  }),
};

const getConnectorTypeLabel = (connectorTypeId: string): string =>
  CONNECTOR_TYPE_LABELS[connectorTypeId] ?? connectorTypeId;

const getColumns = (
  getConnectorUrl: (connectorId: string) => string
): Array<EuiBasicTableColumn<ImportListItem>> => [
  {
    field: 'name',
    name: i18n.translate('xpack.alertingV2.imports.list.column.name', {
      defaultMessage: 'Name',
    }),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'connectorTypeId',
    name: i18n.translate('xpack.alertingV2.imports.list.column.type', {
      defaultMessage: 'Type',
    }),
    sortable: ({ connectorTypeId }: ImportListItem) => getConnectorTypeLabel(connectorTypeId),
    render: (connectorTypeId: ImportListItem['connectorTypeId']) =>
      getConnectorTypeLabel(connectorTypeId),
  },
  {
    name: i18n.translate('xpack.alertingV2.imports.list.column.actions', {
      defaultMessage: 'Actions',
    }),
    align: 'right',
    width: '8%',
    render: ({ connectorId }: ImportListItem) => (
      <ImportActionsMenu connectorId={connectorId} connectorUrl={getConnectorUrl(connectorId)} />
    ),
  },
];

const SEARCH_LABEL = i18n.translate('xpack.alertingV2.imports.list.searchPlaceholder', {
  defaultMessage: 'Search by name or type',
});

/** Case-insensitive match on the import name or its type label. */
export const filterImports = (
  items: readonly ImportListItem[],
  searchText: string
): ImportListItem[] => {
  const needle = searchText.trim().toLowerCase();
  return needle === ''
    ? [...items]
    : items.filter(
        ({ name, connectorTypeId }) =>
          name.toLowerCase().includes(needle) ||
          getConnectorTypeLabel(connectorTypeId).toLowerCase().includes(needle)
      );
};

interface ImportsTableProps {
  items: ImportListItem[];
  isLoading: boolean;
  error?: Error | null;
}

/** The imports of the current space, searched by name, sorted and paged in the browser. */
export const ImportsTable = ({ items, isLoading, error }: ImportsTableProps) => {
  const { getUrlForApp } = useService(CoreStart('application'));
  const [searchText, setSearchText] = useState('');
  const columns = useMemo(
    () =>
      getColumns((connectorId) =>
        getUrlForApp('management', {
          deepLinkId: 'triggersActionsConnectors',
          path: `/connectors/${encodeURIComponent(connectorId)}`,
        })
      ),
    [getUrlForApp]
  );
  const rows = useMemo(() => filterImports(items, searchText), [items, searchText]);

  return (
    <>
      <EuiFieldSearch
        fullWidth
        incremental
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        placeholder={SEARCH_LABEL}
        aria-label={SEARCH_LABEL}
        data-test-subj="importsListSearch"
      />
      <EuiSpacer size="m" />
      <EuiInMemoryTable
        tableCaption={i18n.translate('xpack.alertingV2.imports.list.tableCaption', {
          defaultMessage: 'Alert imports',
        })}
        items={rows}
        itemId="connectorId"
        columns={columns}
        sorting={{ sort: { field: 'name', direction: 'asc' } }}
        pagination={{ pageSizeOptions: [10, 25, 50], initialPageSize: 25 }}
        loading={isLoading}
        error={error?.message}
        noItemsMessage={
          searchText.trim() === ''
            ? i18n.translate('xpack.alertingV2.imports.list.noItems', {
                defaultMessage: 'No imports yet. Set up an import to start receiving alerts.',
              })
            : i18n.translate('xpack.alertingV2.imports.list.noMatches', {
                defaultMessage: 'No imports match your search.',
              })
        }
        data-test-subj="importsTable"
      />
    </>
  );
};
