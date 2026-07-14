/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiTableSelectionType } from '@elastic/eui';
import { EuiFlexGroup, EuiInMemoryTable, EuiText } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import useSet from 'react-use/lib/useSet';

import { ApplicationConnectionsEmptyPrompt } from './application_connections_empty_prompt';
import { useApplicationConnectionsTableColumns } from './application_connections_table_columns';
import { ApplicationConnectionsTableHeader } from './application_connections_table_header';
import { groupedTableStyles } from './application_connections_table_styles';
import { ConnectionRowsTable } from './connection_rows_table';
import { labels } from '../constants/i18n';
import type { ApplicationConnections } from '../constants/types';
import { useNavigation } from '../hooks/use_navigation';
import type { OAuthConnection } from '../service/application_connections_api_client';

export interface ConnectionsByClientTableProps {
  connections: ApplicationConnections[];
  totalCount: number;
  isLoading: boolean;
  selectedByClient: Record<string, OAuthConnection[]>;
  onSelectionChange: (clientId: string, selection: OAuthConnection[]) => void;
}

export const ConnectionsByClientTable = ({
  connections,
  totalCount,
  isLoading,
  selectedByClient,
  onSelectionChange,
}: ConnectionsByClientTableProps) => {
  const { mcpClientCreateUrl } = useNavigation();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRows, { toggle: toggleExpandedRow }] = useSet<string>(new Set());

  const columns = useApplicationConnectionsTableColumns({
    expandedRows,
    onToggleExpand: toggleExpandedRow,
  });

  const itemIdToExpandedRowMap = useMemo(
    () =>
      connections.reduce<Record<string, ReactNode>>((expandedRowMap, connection) => {
        if (expandedRows.has(connection.client.id)) {
          expandedRowMap[connection.client.id] = (
            <ConnectionRowsTable
              client={connection.client}
              connections={connection.connections}
              selection={selectedByClient[connection.client.id] ?? []}
              onSelectionChange={(nextSelection) =>
                onSelectionChange(connection.client.id, nextSelection)
              }
            />
          );
        }
        return expandedRowMap;
      }, {}),
    [connections, expandedRows, selectedByClient, onSelectionChange]
  );

  const selectableConnectionsByClient = useMemo(
    () =>
      connections.reduce<Record<string, OAuthConnection[]>>((selectableByClient, row) => {
        selectableByClient[row.client.id] = row.connections.filter(
          (connection) => !connection.revoked
        );
        return selectableByClient;
      }, {}),
    [connections]
  );

  const selectedClientRows = useMemo(
    () =>
      connections.filter((row) => {
        const selectable = selectableConnectionsByClient[row.client.id] ?? [];
        if (selectable.length === 0) return false;
        const selected = selectedByClient[row.client.id] ?? [];
        return selected.length === selectable.length;
      }),
    [connections, selectableConnectionsByClient, selectedByClient]
  );

  const selectionConfig: EuiTableSelectionType<ApplicationConnections> = useMemo(
    () => ({
      selected: selectedClientRows,
      selectable: (row) => (selectableConnectionsByClient[row.client.id]?.length ?? 0) > 0,
      selectableMessage: (selectable, row) => {
        if (selectable) {
          return labels.groupedColumns.selectClientLabel(row.client.client_name ?? row.client.id);
        }
        return row.connections.length === 0
          ? labels.groupedColumns.noConnectionsClientLabel
          : labels.groupedColumns.allRevokedClientLabel;
      },
      onSelectionChange: (nextSelection) => {
        const nextIds = new Set(nextSelection.map((row) => row.client.id));
        const prevIds = new Set(selectedClientRows.map((row) => row.client.id));
        for (const clientId of nextIds) {
          if (!prevIds.has(clientId)) {
            onSelectionChange(clientId, selectableConnectionsByClient[clientId] ?? []);
          }
        }
        for (const clientId of prevIds) {
          if (!nextIds.has(clientId)) {
            onSelectionChange(clientId, []);
          }
        }
      },
    }),
    [selectedClientRows, selectableConnectionsByClient, onSelectionChange]
  );

  useEffect(() => {
    setPageIndex(0);
  }, [connections]);

  const hasRows = connections.length > 0;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <ApplicationConnectionsTableHeader
        isLoading={isLoading}
        pageIndex={pageIndex}
        pageSize={pageSize}
        visibleCount={connections.length}
        totalCount={totalCount}
        entityKind="application"
      />
      <EuiInMemoryTable
        data-test-subj="applicationConnectionsInMemoryTable"
        tableCaption={labels.groupedTable.tableCaption}
        css={groupedTableStyles(hasRows)}
        rowProps={(row) => ({
          'data-test-subj': `applicationConnectionsListRow-${row.client.id}`,
        })}
        itemId={(row) => row.client.id}
        items={connections}
        columns={columns}
        loading={isLoading}
        selection={selectionConfig}
        pagination={{
          pageIndex,
          pageSize,
          pageSizeOptions: [10, 25, 50, 100],
          showPerPageOptions: true,
        }}
        onTableChange={({ page }: CriteriaWithPagination<ApplicationConnections>) => {
          if (!page) return;
          setPageIndex(page.index);
          if (page.size !== pageSize) {
            setPageSize(page.size);
            setPageIndex(0);
          }
        }}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        sorting={true}
        noItemsMessage={
          !isLoading ? (
            totalCount > 0 ? (
              <EuiText component="p" size="s" textAlign="center" color="subdued">
                {labels.groupedTable.noMatchesMessage}
              </EuiText>
            ) : (
              <ApplicationConnectionsEmptyPrompt createClientUrl={mcpClientCreateUrl} />
            )
          ) : null
        }
        responsiveBreakpoint={false}
      />
    </EuiFlexGroup>
  );
};
