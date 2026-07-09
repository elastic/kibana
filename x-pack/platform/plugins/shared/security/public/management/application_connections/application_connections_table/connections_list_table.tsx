/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CriteriaWithPagination, EuiTableSelectionType } from '@elastic/eui';
import { EuiFlexGroup, EuiInMemoryTable, EuiText } from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';

import { ApplicationConnectionsEmptyPrompt } from './application_connections_empty_prompt';
import { ApplicationConnectionsTableHeader } from './application_connections_table_header';
import { flatTableStyles } from './application_connections_table_styles';
import { isConnectionActive, useConnectionTableColumns } from './connection_table_columns';
import { labels } from '../constants/i18n';
import type { ApplicationConnection } from '../constants/types';
import { useNavigation } from '../hooks/use_navigation';
import type { OAuthConnection } from '../service/application_connections_api_client';

export interface ConnectionsListTableProps {
  connections: ApplicationConnection[];
  totalCount: number;
  isLoading: boolean;
  selectedConnections: OAuthConnection[];
  onSelectionChange: (selection: OAuthConnection[]) => void;
}

export const ConnectionsListTable = ({
  connections,
  totalCount,
  isLoading,
  selectedConnections,
  onSelectionChange,
}: ConnectionsListTableProps) => {
  const { mcpClientCreateUrl } = useNavigation();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const columns = useConnectionTableColumns();

  const selectedItems = useMemo(() => {
    if (selectedConnections.length === 0) return [];
    const selectedIds = new Set(selectedConnections.map((c) => c.id));
    return connections.filter((row) => selectedIds.has(row.connection.id));
  }, [connections, selectedConnections]);

  const selectionConfig: EuiTableSelectionType<ApplicationConnection> = {
    selected: selectedItems,
    onSelectionChange: (next) => onSelectionChange(next.map((row) => row.connection)),
    selectable: isConnectionActive,
    selectableMessage: (selectable, { connection }) =>
      selectable
        ? labels.connectionColumns.selectRowLabel(connection.name ?? connection.id)
        : labels.connectionColumns.revokedRowLabel,
  };

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
        entityKind="connection"
      />
      <EuiInMemoryTable
        data-test-subj="applicationConnectionsListView"
        tableCaption={labels.listTable.tableCaption}
        css={flatTableStyles(hasRows)}
        rowProps={({ connection }) => ({
          'data-test-subj': `applicationConnectionsListViewRow-${connection.id}`,
        })}
        itemId={(row) => row.connection.id}
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
        onTableChange={({ page }: CriteriaWithPagination<ApplicationConnection>) => {
          if (!page) return;
          setPageIndex(page.index);
          if (page.size !== pageSize) {
            setPageSize(page.size);
            setPageIndex(0);
          }
        }}
        sorting={true}
        noItemsMessage={
          !isLoading ? (
            totalCount > 0 ? (
              <EuiText component="p" size="s" textAlign="center" color="subdued">
                {labels.listTable.noMatchesMessage}
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
