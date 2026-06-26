/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiInMemoryTableProps, EuiTableSelectionType } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo } from 'react';

import { isConnectionActive, useConnectionTableColumns } from './connection_table_columns';
import { labels } from '../constants/i18n';
import type { ApplicationConnection } from '../constants/types';
import type { OAuthClient, OAuthConnection } from '../service/application_connections_api_client';

export interface ConnectionRowsTableProps {
  client: OAuthClient;
  connections: OAuthConnection[];
  selection: OAuthConnection[];
  onSelectionChange: (selection: OAuthConnection[]) => void;
}

const tableStyles = css`
  .euiTableHeaderCellCheckbox .euiCheckbox {
    display: none;
  }

  .euiTableRow:last-child > td {
    border-block-end: none;
  }
`;

const sorting: EuiInMemoryTableProps<ApplicationConnection>['sorting'] = {
  sort: { field: 'connection.creation', direction: 'desc' },
};

export const ConnectionRowsTable: FunctionComponent<ConnectionRowsTableProps> = ({
  client,
  connections,
  selection,
  onSelectionChange,
}) => {
  const columns = useConnectionTableColumns({ withClientNameColumn: false });

  const applicationConnectionList = useMemo<ApplicationConnection[]>(
    () => connections.map((connection) => ({ client, connection })),
    [client, connections]
  );

  const selectedItems = useMemo<ApplicationConnection[]>(() => {
    if (selection.length === 0) return [];
    const selectedIds = new Set(selection.map((connection) => connection.id));
    return applicationConnectionList.filter((applicationConnection) =>
      selectedIds.has(applicationConnection.connection.id)
    );
  }, [applicationConnectionList, selection]);

  const handleSelectionChange = useCallback(
    (selectedConnections: ApplicationConnection[]) => {
      onSelectionChange(selectedConnections.map(({ connection }) => connection));
    },
    [onSelectionChange]
  );

  const selectionConfig: EuiTableSelectionType<ApplicationConnection> = {
    selected: selectedItems,
    onSelectionChange: handleSelectionChange,
    selectable: isConnectionActive,
    selectableMessage: (selectable, { connection }) =>
      selectable
        ? labels.connectionColumns.selectRowLabel(connection.name ?? connection.id)
        : labels.connectionColumns.revokedRowLabel,
  };

  return (
    <EuiInMemoryTable
      tableCaption={labels.childTable.tableCaption}
      css={tableStyles}
      itemId={(applicationConnection) => applicationConnection.connection.id}
      items={applicationConnectionList}
      columns={columns}
      selection={selectionConfig}
      sorting={sorting}
      data-test-subj={`applicationConnectionsChildTable-${client.id}`}
    />
  );
};
