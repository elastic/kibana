/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import type { CriteriaWithPagination, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FindExternalSourcesSortField } from '@kbn/alerting-v2-schemas';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import type { ImportListItem } from '../../hooks/use_fetch_imports';
import { ImportActionsMenu } from './import_actions_menu';

export const IMPORTS_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

interface ImportTypeDisplay {
  label: string;
  /** The type of the connector the import receives events through, which holds its icon. */
  connectorTypeId: string;
}

const IMPORT_TYPE_DISPLAY: Readonly<Record<string, ImportTypeDisplay>> = {
  datadog: {
    label: i18n.translate('xpack.alertingV2.imports.list.type.datadog', {
      defaultMessage: 'Datadog',
    }),
    connectorTypeId: '.datadog',
  },
};

/** The import type's connector icon; a generic plug when the connector type has none. */
const ImportTypeIcon = ({ connectorTypeId }: { connectorTypeId: string }) => {
  const icon = ConnectorIconsMap.get(connectorTypeId);
  if (!icon) {
    return <EuiIcon type="plugs" size="m" aria-hidden="true" />;
  }
  return (
    <Suspense fallback={<EuiIcon type="empty" size="m" aria-hidden="true" />}>
      <EuiIcon type={icon} size="m" aria-hidden="true" />
    </Suspense>
  );
};

const ACTIONS_COLUMN: EuiBasicTableColumn<ImportListItem> = {
  name: i18n.translate('xpack.alertingV2.imports.list.column.actions', {
    defaultMessage: 'Actions',
  }),
  align: 'right',
  width: '8%',
  render: ({ id, name }: ImportListItem) => <ImportActionsMenu importId={id} importName={name} />,
};

const getColumns = (canDelete: boolean): Array<EuiBasicTableColumn<ImportListItem>> => [
  {
    field: 'name',
    name: i18n.translate('xpack.alertingV2.imports.list.column.name', {
      defaultMessage: 'Name',
    }),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'type',
    name: i18n.translate('xpack.alertingV2.imports.list.column.type', {
      defaultMessage: 'Type',
    }),
    sortable: true,
    render: (type: ImportListItem['type']) => {
      const { label, connectorTypeId } = IMPORT_TYPE_DISPLAY[type] ?? {
        label: type,
        connectorTypeId: '',
      };
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <ImportTypeIcon connectorTypeId={connectorTypeId} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{label}</EuiFlexItem>
        </EuiFlexGroup>
      );
    },
  },
  ...(canDelete ? [ACTIONS_COLUMN] : []),
];

const SEARCH_LABEL = i18n.translate('xpack.alertingV2.imports.list.searchPlaceholder', {
  defaultMessage: 'Search by name or description',
});

/** The list API sort fields that are also table columns. */
export type ImportsSortField = Extract<FindExternalSourcesSortField, keyof ImportListItem>;

export interface ImportsTableChange {
  pageIndex: number;
  pageSize: number;
  sortField: ImportsSortField;
  sortOrder: 'asc' | 'desc';
}

const isSortField = (field: unknown): field is ImportsSortField =>
  field === 'name' || field === 'type';

interface ImportsTableProps {
  items: ImportListItem[];
  totalItemCount: number;
  isLoading: boolean;
  error?: Error | null;
  pageIndex: number;
  pageSize: number;
  sortField: ImportsSortField;
  sortOrder: 'asc' | 'desc';
  searchText: string;
  /** Whether the user can delete imports, which also deletes their connectors. */
  canDelete: boolean;
  onSearchChange: (searchText: string) => void;
  onTableChange: (change: ImportsTableChange) => void;
}

/** One page of the imports of the current space. Searching, sorting and paging happen on the server. */
export const ImportsTable = ({
  items,
  totalItemCount,
  isLoading,
  error,
  pageIndex,
  pageSize,
  sortField,
  sortOrder,
  searchText,
  canDelete,
  onSearchChange,
  onTableChange,
}: ImportsTableProps) => {
  const columns = useMemo(() => getColumns(canDelete), [canDelete]);

  const onChange = ({ page, sort }: CriteriaWithPagination<ImportListItem>) => {
    onTableChange({
      pageIndex: page.index,
      pageSize: page.size,
      sortField: isSortField(sort?.field) ? sort.field : sortField,
      sortOrder: sort?.direction ?? sortOrder,
    });
  };

  return (
    <>
      <EuiFieldSearch
        fullWidth
        incremental
        value={searchText}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={SEARCH_LABEL}
        aria-label={SEARCH_LABEL}
        data-test-subj="importsListSearch"
      />
      <EuiSpacer size="m" />
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.alertingV2.imports.list.tableCaption', {
          defaultMessage: 'Alert imports',
        })}
        items={items}
        itemId="id"
        columns={columns}
        sorting={{ sort: { field: sortField, direction: sortOrder } }}
        pagination={{
          pageIndex,
          pageSize,
          totalItemCount,
          pageSizeOptions: [...IMPORTS_PAGE_SIZE_OPTIONS],
        }}
        onChange={onChange}
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
