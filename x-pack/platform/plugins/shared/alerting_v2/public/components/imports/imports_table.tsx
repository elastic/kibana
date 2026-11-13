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
import type { ImportListItem } from '../../hooks/use_fetch_imports';

const CONNECTOR_TYPE_LABELS: Readonly<Record<string, string>> = {
  '.inboundWebhook': i18n.translate('xpack.alertingV2.imports.list.type.customWebhook', {
    defaultMessage: 'Custom webhook',
  }),
  '.datadog': i18n.translate('xpack.alertingV2.imports.list.type.datadog', {
    defaultMessage: 'Datadog',
  }),
};

const getConnectorTypeLabel = (connectorTypeId: string): string =>
  CONNECTOR_TYPE_LABELS[connectorTypeId] ?? connectorTypeId;

const columns: Array<EuiBasicTableColumn<ImportListItem>> = [
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
];

const SEARCH_LABEL = i18n.translate('xpack.alertingV2.imports.list.searchPlaceholder', {
  defaultMessage: 'Search by name',
});

/** Case-insensitive match on the import name. */
export const filterImportsByName = (
  items: readonly ImportListItem[],
  searchText: string
): ImportListItem[] => {
  const needle = searchText.trim().toLowerCase();
  return needle === ''
    ? [...items]
    : items.filter(({ name }) => name.toLowerCase().includes(needle));
};

interface ImportsTableProps {
  items: ImportListItem[];
  isLoading: boolean;
  error?: Error | null;
}

/** The imports of the current space, searched by name, sorted and paged in the browser. */
export const ImportsTable = ({ items, isLoading, error }: ImportsTableProps) => {
  const [searchText, setSearchText] = useState('');
  const filteredItems = useMemo(() => filterImportsByName(items, searchText), [items, searchText]);

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
        items={filteredItems}
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
